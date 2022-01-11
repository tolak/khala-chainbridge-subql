import { SubstrateBlock } from '@subql/types'
import { SpecVersion, Circulation } from '../types'
import { AccountInfo, Balance } from "@polkadot/types/interfaces";

let lastUpdatedBlock = BigInt(0);
export async function handleBlock(block: SubstrateBlock): Promise<void> {
    let blockHeight = block.block.header.number.toBigInt()

    // Update spec version
    const specVersion = await SpecVersion.get(block.specVersion.toString())
    if (specVersion === undefined) {
        const newSpecVersion = new SpecVersion(block.specVersion.toString())
        newSpecVersion.blockHeight = blockHeight
        await newSpecVersion.save()
    }

    // Circulation computing, updated every 100 blocks
    let circulation = await Circulation.get(`circulation-${lastUpdatedBlock.toString()}`)
    if (circulation === undefined || (blockHeight - lastUpdatedBlock) === BigInt(300)) {
        try {
            // query onchain storage
            await api.queryMulti([
                api.query.balances.totalIssuance,
                [api.query.system.account, '5EYCAe5iixJKLJE5vokZcdJwS4ZpFU23Ged95YDBznC789dM'],
                [api.query.system.account, '5EYCAe5iixJKLJE7D1zaaRxUiy2bL4KUKqZBSckPw3iWSyvk']
            ], async ([b_totalSupply, b_bridgeReserved, b_miningSubsidy]) => {
                let totalSupply = (b_totalSupply as Balance).toBigInt()
                let bridgeReserved = ((b_bridgeReserved as AccountInfo).data.free as Balance).toBigInt()
                let miningSubsidy = ((b_miningSubsidy as AccountInfo).data.free as Balance).toBigInt()
                circulation = new Circulation(`circulation-${blockHeight.toString()}`)
                circulation.khala = totalSupply - bridgeReserved - miningSubsidy
                circulation.total = totalSupply - miningSubsidy
                circulation.blockHeight = blockHeight
                await circulation.save()
                logger.debug(`Save circulation [khala: ${circulation.khala.toString()}, total: ${circulation.total.toString()}] at block ${blockHeight.toString()}`)
                lastUpdatedBlock = blockHeight;
            });
        } catch(e) {
            logger.error(`Circulation error: ${e}`)
            
        }
    }
}
