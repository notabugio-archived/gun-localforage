import localForage from 'localforage'

export interface GunNode {
  _: {
    '#': string
    '>': {
      [key: string]: number
    }
    [key: string]: any
  }
  [key: string]: any
}

export interface GunPut {
  [soul: string]: GunNode
}

export class GunLocalForageClient {
  Gun: any

  constructor(Gun: any) {
    this.Gun = Gun
  }

  async get(soul: string) {
    const result = localForage.getItem(`gun/nodes/${escape(soul)}`)
    return result || null
  }

  async read(soul: string) {
    const data: any = await this.get(soul)
    if (!data) return

    if (!this.Gun.SEA || soul.indexOf('~') === -1) return data

    for (let key in data) {
      if (key === '_') continue
      this.Gun.SEA.verify(
        this.Gun.SEA.opt.pack(data[key], key, data, soul),
        false,
        (res: GunNode) => (data[key] = this.Gun.SEA.opt.unpack(res, key, data))
      )
    }

    return data
  }

  serialize(node: GunNode) {
    return JSON.stringify(node)
  }

  deserialize(data: string) {
    return JSON.parse(data)
  }

  async writeNode(soul: string, nodeData: GunNode) {
    if (!soul) return
    const node: any = (await this.get(soul)) || {}
    const nodeDataMeta = (nodeData && nodeData['_']) || {}
    const nodeDataState = nodeDataMeta['>'] || {}
    const meta = (node['_'] = node['_'] || { '#': soul, '>': {} })
    const state = (meta['>'] = meta['>'] || {})

    for (let key in nodeData) {
      if (key === '_' || !(key in nodeDataState)) continue
      node[key] = nodeData[key]
      state[key] = nodeDataState[key]
    }

    try {
      await localForage.setItem(`gun/nodes/${escape(soul)}`, node)
    } catch (e) {
      console.error('Error writing to localForage', e.stack || e)
      throw e
    }
  }

  async write(put: GunPut) {
    if (!put) return
    for (let soul in put) await this.writeNode(soul, put[soul])
  }

  // tslint:disable-next-line: no-empty
  close() {}
}

export function createClient(Gun: any) {
  return new GunLocalForageClient(Gun)
}
