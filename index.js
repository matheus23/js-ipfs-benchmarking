import Ipfs from "ipfs-core"
import Repo from "ipfs-repo"
import { MemoryDatastore } from "interface-datastore"
import crypto from "crypto"
import { performance } from "perf_hooks"

async function createRegularIPFS() {
    return await Ipfs.create({
        offline: true,
        silent: true,
        config: {
            Addresses: {
                Swarm: []
            },
        },
    })
}

async function createInMemoryIPFS() {
  return await Ipfs.create({
    offline: true,
    silent: true,
    config: {
      Addresses: {
        Swarm: []
      },
    },
    libp2p: {
      connectionManager: {
        autoDial: false,
        maxConnections: 0,
        minConnections: -1,
        pollInterval: 10000000,
      },
      peerStore: {
        persistence: false,
        threshold: 0,
      },
    },
    repo: new Repo('inmem', {
      lock: {
        lock: async () => ({ close: async () => { return } }),
        locked: async () => Promise.resolve(false)
      },
      autoMigrate: false,
      storageBackends: {
        root: MemoryDatastore,
        blocks: MemoryDatastore,
        keys: MemoryDatastore,
        datastore: MemoryDatastore,
        pins: MemoryDatastore,
      },
    })
  })
}

async function runBenchmark() {
    const ipfs = await createInMemoryIPFS()
   
    const amount = 3000

    console.log("add #\ttime in ms")

    for (let i = 0; i < amount; i++) {
        const ms = await addAndMeasureRandom(ipfs, true)
        console.log(`${i}\t${ms.toFixed(2).replace(".", ",")}`) // sorry, I'm german and this is what google sheets requires for me :(
    }

    await ipfs.stop()
}

async function addAndMeasureRandom(ipfs, shouldPin) {
    const randomBuffer = crypto.pseudoRandomBytes(64)

    const before = performance.now()
    await ipfs.add(randomBuffer, { pin: shouldPin })
    return performance.now() - before
}


runBenchmark()
