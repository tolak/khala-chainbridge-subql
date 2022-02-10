import { Bytes, U256 } from '@polkadot/types'
import { IEvent } from '@polkadot/types/types'
import { SubstrateEvent } from '@subql/types'
import { AccountId } from "@polkadot/types/interfaces";
import { BridgeChainId, DepositNonce, ResourceId } from '../interfaces'
import { BridgeOutboundingRecord, BridgeInboundingRecord, Tx } from '../types'

const ROUTER = '3zcnkmF6XjEogm8vAyPiL2ykPZHpeVtcfDcwTWJ2teqdSvjq'

export async function handleFungibleTransferEvent(ctx: SubstrateEvent): Promise<void> {
    const {
        data: [chainIdCodec, depositNonceCodec, resourceId, amount, recipient],
    } = ctx.event as unknown as IEvent<[BridgeChainId, DepositNonce, ResourceId, U256, Bytes]>

    const chainId = chainIdCodec.toNumber()
    const depositNonce = depositNonceCodec.toBigInt()

    const id = `${chainId}-${depositNonce}`

    if (undefined === (await BridgeOutboundingRecord.get(id))) {
        const record = new BridgeOutboundingRecord(id)
        record.createdAt = ctx.block.timestamp
        record.destChainId = chainId
        record.depositNonce = depositNonce
        record.resourceId = resourceId.toHex()
        record.amount = amount.toBigInt()
        record.recipient = recipient.toHex()
        record.sender = ctx.extrinsic?.extrinsic.signer.toString()

        if (record.sender === ROUTER)
            record.isX3 = true
        else
            record.isX3 = false

        let txId = ctx.extrinsic?.extrinsic.hash.toHex()
        let sendTx = new Tx(txId)
        sendTx.hash = ctx.extrinsic?.extrinsic.hash.toHex()
        sendTx.sender = ctx.extrinsic?.extrinsic.signer.toString()
        await sendTx.save()

        record.sendTx = txId
        await record.save()
        logger.debug(`Created new outbounding record: ${record}`)
    }
}

export async function handleProposalVoteForEvent(ctx: SubstrateEvent): Promise<void> {
    const {
        data: [chainIdCodec, depositNonceCodec, _voter],
    } = ctx.event as unknown as IEvent<[BridgeChainId, DepositNonce, AccountId]>

    const originChainId = chainIdCodec.toNumber()
    const depositNonce = depositNonceCodec.toBigInt()

    const id = `${originChainId}-${depositNonce}`
    let record = await BridgeInboundingRecord.get(id)
    if (record === undefined) {
        record = new BridgeInboundingRecord(id)
        record.createdAt = ctx.block.timestamp
        record.originChainId = originChainId
        record.depositNonce = depositNonce
        record.resourceId = ctx.extrinsic?.extrinsic.args[2].toHex()
        record.status = 'Initiated'
        record.voteTxs = []
        logger.debug(`Created new inbounding record: ${record}`)
    }

    let txId = ctx.extrinsic.extrinsic.hash.toHex()
    let voteTx = new Tx(txId)
    voteTx.hash = ctx.extrinsic.extrinsic.hash.toHex()
    voteTx.sender = ctx.extrinsic?.extrinsic.signer.toString()
    await voteTx.save()

    let votes = record.voteTxs
    votes.push(txId)
    record.voteTxs = votes
    await record.save()
    logger.debug(`Add new vote into inbounding record: ${record}`)
}

export async function handleProposalApprovedEvent(ctx: SubstrateEvent): Promise<void> {
    const {
        data: [chainIdCodec, depositNonceCodec],
    } = ctx.event as unknown as IEvent<[BridgeChainId, DepositNonce]>

    const originChainId = chainIdCodec.toNumber()
    const depositNonce = depositNonceCodec.toBigInt()

    const id = `${originChainId}-${depositNonce}`
    let record = await BridgeInboundingRecord.get(id)
    if (record !== undefined) {
        record.status = 'Approved'
        await record.save()
        logger.debug(`Inbounding record approved: ${id}`)
    }
}

export async function handleProposalSucceededEvent(ctx: SubstrateEvent): Promise<void> {
    const {
        data: [chainIdCodec, depositNonceCodec],
    } = ctx.event as unknown as IEvent<[BridgeChainId, DepositNonce]>

    const originChainId = chainIdCodec.toNumber()
    const depositNonce = depositNonceCodec.toBigInt()

    const id = `${originChainId}-${depositNonce}`
    let record = await BridgeInboundingRecord.get(id)
    if (record !== undefined) {
        record.status = 'Succeeded'

        let txId = ctx.extrinsic?.extrinsic.hash.toHex()
        let executeTx = new Tx(txId)
        executeTx.hash = ctx.extrinsic?.extrinsic.hash.toHex()
        executeTx.sender = ctx.extrinsic?.extrinsic.signer.toString()
        await executeTx.save()

        record.executeTx = txId
        await record.save()
        logger.debug(`Inbounding record succeeded: ${id}, with execute tx: ${executeTx}`)
    }
}

export async function handleProposalRejectedEvent(ctx: SubstrateEvent): Promise<void> {
    const {
        data: [chainIdCodec, depositNonceCodec],
    } = ctx.event as unknown as IEvent<[BridgeChainId, DepositNonce]>

    const originChainId = chainIdCodec.toNumber()
    const depositNonce = depositNonceCodec.toBigInt()

    const id = `${originChainId}-${depositNonce}`
    let record = await BridgeInboundingRecord.get(id)
    if (record !== undefined) {
        record.status = 'Rejected'
        await record.save()
        logger.debug(`Inbounding record rejected: ${id}`)
    }
}

export async function handleProposalFailedEvent(ctx: SubstrateEvent): Promise<void> {
    const {
        data: [chainIdCodec, depositNonceCodec],
    } = ctx.event as unknown as IEvent<[BridgeChainId, DepositNonce]>

    const originChainId = chainIdCodec.toNumber()
    const depositNonce = depositNonceCodec.toBigInt()

    const id = `${originChainId}-${depositNonce}`
    let record = await BridgeInboundingRecord.get(id)
    if (record !== undefined) {
        record.status = 'Failed'
        await record.save()
        logger.debug(`Inbounding record failed: ${id}`)
    }
}