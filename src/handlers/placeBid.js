import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import AWS from 'aws-sdk';
import createHttpError from 'http-errors';
import commonMiddleware from '../lib/commonMiddleware.js';
import placeBidSchema from '../schemas/placeBidSchema.js';
import { getAuctionById } from './getAuction.js';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function placeBid(event, context) {
    const { id } = event.pathParameters;
    const { amount } = event.body;
    const { email } = event.requestContext.authorizer.lambda;

    const auction = await getAuctionById(id);

    if (email === auction.seller) {
        throw new createHttpError.Forbidden(
            'You cannot bid on your own auctions'
        );
    }

    if (email === auction.highestBid.bidder) {
        throw new createHttpError.Forbidden(
            'You are already the highest bidder'
        );
    }

    if (auction.status !== 'OPEN') {
        throw new createHttpError.Forbidden(
            `You cannot bid on closed auctions`
        );
    }

    if (amount <= auction.highestBid.amount) {
        throw new createHttpError.Forbidden(
            `Your bid must be higher than ${auction.highestBid.amount}!`
        );
    }

    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Key: { id },
        UpdateExpression:
            'set highestBid.amount = :amount, highestBid.bidder = :bidder',
        ExpressionAttributeValues: {
            ':amount': amount,
            ':bidder': email,
        },
        ReturnValues: 'ALL_NEW',
    };

    let updatedAuction;

    try {
        const result = await dynamodb.update(params).promise();

        updatedAuction = result.Attributes;
    } catch (error) {
        console.error(error);
        throw new createHttpError.InternalServerError(error);
    }

    return {
        statusCode: 200,
        body: JSON.stringify(updatedAuction),
    };
}

export const handler = commonMiddleware(placeBid).use(
    validator({
        eventSchema: transpileSchema(placeBidSchema),
    })
);
