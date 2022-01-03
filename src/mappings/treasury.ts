import { Treasury } from '../types/models/Treasury'
import { SubstrateEvent } from "@subql/types"
import { IEvent } from '@polkadot/types/types'
import { U128 } from '@polkadot/types'

// collect total treasury incoming
export async function handleTreasuryDeposit(event: SubstrateEvent): Promise<void> {
    let blockHeight = event.block.block.header.number.toBigInt()
    let treasury = await Treasury.get(`treasury-${blockHeight.toString()}`)
    if (treasury === undefined) {
        treasury = new Treasury(`treasury-${blockHeight.toString()}`)
        let preIncome = await Treasury.get(`treasury-${(blockHeight - BigInt(1)).toString()}`)
        if (preIncome !== undefined) {
            treasury.amount = preIncome.amount
        } else {
            // startBlock
            treasury.amount = BigInt(0)
        }
        treasury.blockHeight = blockHeight
    }
    if (treasury.blockHeight !== blockHeight) throw new Error('Block number dismatch, qed.')

    if (event.event.section === 'treasury' && event.event.method === 'Deposit') {
        const {
            data: [encodedAmount],
        } = event.event as unknown as IEvent<[U128]>
        treasury.amount = treasury.amount + encodedAmount.toBigInt()
        logger.info(`Got new treasury income: ${encodedAmount.toBigInt().toString()}, total income: ${treasury.amount.toString()}`)
    }

    await treasury.save()
}
