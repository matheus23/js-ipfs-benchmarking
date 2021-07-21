import Ipfs from "ipfs-core"
import Repo from "ipfs-repo"
import { MemoryDatastore } from "interface-datastore"
import crypto from "crypto"
import { performance } from "perf_hooks"
import { promises as fs } from "fs"

async function createRegularIPFS() {
    return await Ipfs.create({
        offline: true,
        silent: true,
        preload: {
            enabled: false,
        },
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
    preload: {
        enabled: false,
    },
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

async function runBenchmark(ipfs, shouldPin, handle) {
    const amount = 3000

    await handle.appendFile(`number of adds ${shouldPin ? "with" : "without"} pinning\ttime for next add in ms\n`, { encoding: "utf-8" })

    for (let i = 0; i < amount; i++) {
        console.log(`${i}/${amount}`)
        const ms = await addAndMeasureRandom(ipfs, shouldPin)
        await handle.appendFile(
            `${i}\t${ms.toFixed(2).replace(".", ",")}\n`, // sorry, I'm german and this is what google sheets requires for me :(
            { encoding: "utf-8" }
        )
    }
}

async function addAndMeasureRandom(ipfs, shouldPin) {
    const randomBuffer = crypto.pseudoRandomBytes(64)

    const before = performance.now()
    await ipfs.add(randomBuffer, { pin: shouldPin })
    return performance.now() - before
}

async function run() {
    const ipfs1 = await createInMemoryIPFS()
    console.log(await ipfs1.version())
    const withPinningHandle = await fs.open("data-with-pinning.csv", "w")
    await runBenchmark(ipfs1, true, withPinningHandle)
    await ipfs1.stop()
    await withPinningHandle.close()
    
    const ipfs2 = await createInMemoryIPFS()
    const withoutPinningHandle = await fs.open("data-without-pinning.csv", "w")
    await runBenchmark(ipfs2, false, withoutPinningHandle)
    await withoutPinningHandle.close()
    await ipfs2.stop()
}

run()
