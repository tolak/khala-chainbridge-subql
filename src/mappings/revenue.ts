import { Revenue } from '../types/models/Revenue'
import { SubstrateEvent } from "@subql/types"
import { IEvent } from '@polkadot/types/types'
import { U128 } from '@polkadot/types'
import BN from 'bn.js'
import { Decimal } from 'decimal.js'

const bnh64bits = new BN('FFFFFFFFFFFFFFFF0000000000000000', 16);
const bnl64bits = new BN('FFFFFFFFFFFFFFFF', 16);

// collect total treasury incoming
export async function handleTreasuryDeposit(event: SubstrateEvent): Promise<void> {
    let blockHeight = event.block.block.header.number.toBigInt()
    let revenue = await Revenue.get(`revenue-${blockHeight.toString()}`)
    if (revenue === undefined) {
        revenue = new Revenue(`revenue-${blockHeight.toString()}`)
        let preRevenue = await Revenue.get(`revenue-${(blockHeight - BigInt(1)).toString()}`)
        if (preRevenue !== undefined) {
            revenue.treasury = preRevenue.treasury
            revenue.mining = preRevenue.mining
        } else {
            // startBlock
            revenue.treasury = BigInt(0)
            revenue.mining = BigInt(0)
        }
        revenue.blockHeight = blockHeight
    }
    if (revenue.blockHeight !== blockHeight) throw new Error('Block number dismatch, qed.')

    if (event.event.section === 'treasury' && event.event.method === 'Deposit') {
        const {
            data: [encodedAmount],
        } = event.event as unknown as IEvent<[U128]>
        revenue.treasury = revenue.treasury + encodedAmount.toBigInt()
        logger.info(`Got new treasury income: ${encodedAmount.toBigInt().toString()}, total income: ${revenue.treasury.toString()}`)
    }

    await revenue.save()
}

// collect total minner rewards
export async function handleMinerSettled(event: SubstrateEvent): Promise<void> {
    let blockHeight = event.block.block.header.number.toBigInt()
    let revenue = await Revenue.get(`revenue-${blockHeight.toString()}`)
    if (revenue === undefined) {
        revenue = new Revenue(`revenue-${blockHeight.toString()}`)
        let preRevenue = await Revenue.get(`revenue-${(blockHeight - BigInt(1)).toString()}`)
        if (preRevenue !== undefined) {
            revenue.treasury = preRevenue.treasury
            revenue.mining = preRevenue.mining
        } else {
            // startBlock
            revenue.treasury = BigInt(0)
            revenue.mining = BigInt(0)
        }
        revenue.blockHeight = blockHeight
    }
    if (revenue.blockHeight !== blockHeight) throw new Error('Block number dismatch, qed.')

    if (event.event.section === 'phalaMining' && event.event.method === 'MinerSettled') {
        const {
            data: [_mainer, _encodedV, encodedPayout],
        } = event.event as unknown as IEvent<[U128]>
        let a = new BN(encodedPayout.toString()).and(bnh64bits).shrn(64)
        let b = new BN(encodedPayout.toString()).and(bnl64bits)
        let strPayout = ((new Decimal(a.toString() + '.' + b.toString())).mul(new Decimal('1000000000000'))).toString()
        revenue.mining = revenue.mining + BigInt(strPayout)
        logger.info(`Got new mining payout: ${strPayout}, total payout: ${revenue.mining.toString()}`)
    }

    await revenue.save()
}
