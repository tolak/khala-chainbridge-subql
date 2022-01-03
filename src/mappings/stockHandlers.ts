import { SubstrateBlock, SubstrateEvent, SubstrateExtrinsic } from '@subql/types'
import { Block, Event, Extrinsic, SpecVersion, Circulation } from '../types'
import { Balance } from "@polkadot/types/interfaces";

export async function handleBlock(block: SubstrateBlock): Promise<void> {
    const blockRecord = new Block(block.block.header.hash.toString())
    blockRecord.blockHeight = block.block.header.number.toBigInt()
    blockRecord.parent = block.block.header.parentHash.toString()
    blockRecord.timestamp = block.timestamp
    await blockRecord.save()

    const specVersion = await SpecVersion.get(block.specVersion.toString())
    if (specVersion === undefined) {
        const newSpecVersion = new SpecVersion(block.specVersion.toString())
        newSpecVersion.blockHeight = block.block.header.number.toBigInt()
        await newSpecVersion.save()
    }

    // circulation computing
    let circulation = await Circulation.get(`circulation-${blockRecord.blockHeight.toString()}`)
    if (circulation === undefined) {
        circulation = new Circulation(`circulation-${blockRecord.blockHeight.toString()}`)
        // query onchain storage
        const totalSupply = ((await api.query.balances.totalIssuance()) as Balance).toBigInt()
        const bridgeReserved = ((await api.query.system.account('5EYCAe5iixJKLJE5vokZcdJwS4ZpFU23Ged95YDBznC789dM')).data.free as Balance).toBigInt()
        const miningSubsidy = ((await api.query.system.account('5EYCAe5iixJKLJE7D1zaaRxUiy2bL4KUKqZBSckPw3iWSyvk')).data.free as Balance).toBigInt()
        circulation.khala = totalSupply - bridgeReserved - miningSubsidy
        circulation.total = totalSupply - miningSubsidy
        circulation.blockHeight = blockRecord.blockHeight
        await circulation.save()
        logger.info(`Save circulation [khala: ${circulation.khala.toString()}, total: ${circulation.total.toString()}] at block ${blockRecord.blockHeight.toString()}`)
    }
}

export async function handleEvent(event: SubstrateEvent): Promise<void> {
    const thisEvent = await Event.get(`${event.block.block.header.number.toNumber()}-${event.idx.toString()}`)
    if (thisEvent === undefined) {
        const newEvent = new Event(`${event.block.block.header.number.toNumber()}-${event.idx.toString()}`)
        newEvent.blockHeight = event.block.block.header.number.toBigInt()
        newEvent.timestamp = event.block.timestamp
        newEvent.module = event.event.section
        newEvent.event = event.event.method
        await newEvent.save()
    }
}

export async function handleCall(extrinsic: SubstrateExtrinsic): Promise<void> {
    const thisExtrinsic = await Extrinsic.get(extrinsic.extrinsic.hash.toString())
    if (thisExtrinsic === undefined) {
        const newExtrinsic = new Extrinsic(extrinsic.extrinsic.hash.toString())
        newExtrinsic.module = extrinsic.extrinsic.method.section
        newExtrinsic.call = extrinsic.extrinsic.method.method
        newExtrinsic.blockHeight = extrinsic.block.block.header.number.toBigInt()
        newExtrinsic.timestamp = extrinsic.block.timestamp
        newExtrinsic.success = extrinsic.success
        newExtrinsic.isSigned = extrinsic.extrinsic.isSigned
        await newExtrinsic.save()
    }
}
