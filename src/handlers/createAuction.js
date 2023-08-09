import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import AWS from 'aws-sdk';
import createHttpError from 'http-errors';
import { v4 as uuid } from 'uuid';
import commonMiddleware from '../lib/commonMiddleware.js';
import createAuctionSchema from '../schemas/createAuctionSchema.js';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function createAuction(event, context) {
    const { title } = event.body;

    const { email } = event.requestContext.authorizer.lambda;

    const now = new Date();
    const endDate = new Date();
    endDate.setHours(now.getHours() + 1);

    const auction = {
        id: uuid(),
        title,
        status: 'OPEN',
        createdAt: now.toISOString(),
        endingAt: endDate.toISOString(),
        highestBid: {
            amount: 0,
        },
        seller: email,
    };

    try {
        await dynamodb
            .put({
                TableName: process.env.AUCTIONS_TABLE_NAME,
                Item: auction,
            })
            .promise();
    } catch (error) {
        console.error(error);
        throw new createHttpError.InternalServerError(error);
    }

    return {
        statusCode: 201,
        body: JSON.stringify(auction),
    };
}

export const handler = commonMiddleware(createAuction).use(
    validator({
        eventSchema: transpileSchema(createAuctionSchema),
    })
);
