import { GunLocalForageClient, GunPut } from './client'

interface GunGet {
  '#': string
  get: {
    '#': string
  }
}

export const attachToGun = (Gun: any) =>
  Gun.on('create', function(this: any, db: any) {
    const localforage = (Gun.localforage = db.localforage = new GunLocalForageClient(Gun))

    db.on('get', async function(this: any, request: GunGet) {
      this.to.next(request)
      if (!request) return
      const dedupId = request['#']
      const get = request.get
      const soul = get['#']

      try {
        const result = await localforage.get(soul)
        const meta = function() {} as any
        meta.faith = true

        if (result) {
          db.on('in', {
            '@': dedupId,
            from: 'local',
            put: { [soul]: result },
            err: null,
            _: meta
          })
        }
      } catch (err) {
        console.error('error', err.stack || err)
      }
    })

    db.on('put', async function(this: any, request: GunPut) {
      this.to.next(request)
      if (!request) return

      try {
        await localforage.write(request.put)
      } catch (err) {
        console.error('error writing', err.stack || err)
      }
    })

    this.to.next(db)
  })
