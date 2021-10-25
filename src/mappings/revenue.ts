import { Revenue } from '../types/models/Revenue'
import { SubstrateEvent } from "@subql/types"
import { IEvent } from '@polkadot/types/types'
import { U128 } from '@polkadot/types'

export async function handleTreasuryDeposit(event: SubstrateEvent): Promise<void> {
    let blockHeight = event.block.block.header.number.toBigInt()
    let revenue = await Revenue.get(`treasury-${blockHeight.toString()}`)
    if (revenue === undefined) {
        revenue = new Revenue(`treasury-${blockHeight.toString()}`)
        revenue.blockHeight = blockHeight
        revenue.amount = BigInt(0)
    }
    if (revenue.blockHeight !== blockHeight) throw new Error('Block number dismatch, qed.')

    if (event.event.section === 'treasury' && event.event.method === 'Deposit') {
        const {
            data: [encodedAmount],
        } = event.event as unknown as IEvent<[U128]>
        revenue.amount = revenue.amount + encodedAmount.toBigInt()
    }

    await revenue.save()
}