import { Mining } from '../types/models/Mining'
import { SubstrateEvent } from "@subql/types"
import { IEvent } from '@polkadot/types/types'
import { U128 } from '@polkadot/types'
import BN from 'bn.js'
import { Decimal } from 'decimal.js'

const BASE = new Decimal(2).pow(64);
const MUL = new Decimal(10).pow(12);

// collect total minner rewards
export async function handleMinerSettled(event: SubstrateEvent): Promise<void> {
    let blockHeight = event.block.block.header.number.toBigInt()
    let mining = await Mining.get(`mining-${blockHeight.toString()}`)
    if (mining === undefined) {
        mining = new Mining(`mining-${blockHeight.toString()}`)
        let preReward = await Mining.get(`mining-${(blockHeight - BigInt(1)).toString()}`)
        if (preReward !== undefined) {
            mining.amount = preReward.amount
        } else {
            // startBlock
            mining.amount = BigInt(0)
        }
        mining.blockHeight = blockHeight
    }
    if (mining.blockHeight !== blockHeight) throw new Error('Block number dismatch, qed.')

    if (event.event.section === 'phalaMining' && event.event.method === 'MinerSettled') {
        const {
            data: [_mainer, _encodedV, encodedPayout],
        } = event.event as unknown as IEvent<[U128]>
        let dec = new Decimal(encodedPayout.toString()).div(BASE).mul(MUL)
        mining.amount = mining.amount + BigInt(dec.toFixed(0))
        logger.trace(`Got new mining payout: ${dec.toString()}, total payout: ${mining.amount.toString()}`)
    }

    await mining.save()
}
