import { GunLocalForageClient, GunNode } from './client'

export const respondToGets = (Gun: any, { disableRelay = true, skipValidation = true } = {}) => (
  db: any
) => {
  const localforage = (Gun.localforage = db.localforage = new GunLocalForageClient(Gun))

  db.onIn(async function gunLmdbRespondToGets(msg: any) {
    const { from, json, fromCluster } = msg
    const get = json && json.get
    const soul = get && get['#']
    const dedupId = (json && json['#']) || ''

    if (!soul || fromCluster) return msg

    try {
      // const result = await localforage.get(soul)
      const node = (await localforage.get(soul)) || null
      let put = 'null'

      const json = {
        '#': from.msgId(),
        '@': dedupId,
        put: node ? { [soul]: node } : null
      }

      from.send({
        json,
        ignoreLeeching: true,
        skipValidation: !node || skipValidation
      })

      return disableRelay && node ? { ...msg, noRelay: true } : msg
    } catch (err) {
      console.error('get err', err.stack || err)
      const json = {
        '#': from.msgId(),
        '@': dedupId,
        err: `${err}`
      }

      from.send({ json, ignoreLeeching: true, skipValidation })
      return msg
    }
  })

  return db
}

export const acceptWrites = (Gun: any, { disableRelay = false } = {}) => (db: any) => {
  const localforage = (Gun.localforage = db.localforage = new GunLocalForageClient(Gun))

  db.onIn(async function gunLmdbAcceptWrites(msg: any) {
    if (msg.fromCluster || !msg.json.put) return msg
    const diff: GunNode = await db.getDiff(msg.json.put)
    const souls = diff && Object.keys(diff)

    if (!souls || !souls.length) {
      return disableRelay ? { ...msg, noRelay: true } : msg
    }

    try {
      await localforage.write(diff)
      const json = { '@': msg.json['#'], ok: true, err: null }

      msg.from &&
        msg.from.send &&
        msg.from.send({
          json,
          noRelay: true,
          ignoreLeeching: true,
          skipValidation: true
        })
      return msg
    } catch (err) {
      console.error('error writing data', err)
      const json = { '@': msg.json['#'], ok: false, err: `${err}` }

      msg.from &&
        msg.from.send &&
        msg.from.send({
          json,
          noRelay: disableRelay,
          ignoreLeeching: true,
          skipValidation: true
        })

      return msg
    }
  })

  return db
}
