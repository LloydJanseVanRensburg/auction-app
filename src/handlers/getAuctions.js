import validator from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import AWS from 'aws-sdk';
import createHttpError from 'http-errors';
import commonMiddleware from '../lib/commonMiddleware.js';
import getAuctionsSchema from '../schemas/getAuctionsSchema.js';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function getAuctions(event, context) {
    const { status } = event.queryStringParameters;
    let auctions;

    const params = {
        TableName: process.env.AUCTIONS_TABLE_NAME,
        IndexName: 'statusAndEndDate',
        KeyConditionExpression: ' #status = :status',
        ExpressionAttributeValues: {
            ':status': status,
        },
        ExpressionAttributeNames: {
            '#status': 'status',
        },
    };

    try {
        const results = await dynamodb.query(params).promise();

        auctions = results.Items;
    } catch (error) {
        console.error(error);
        throw new createHttpError.InternalServerError(error);
    }

    return {
        statusCode: 200,
        body: JSON.stringify(auctions),
    };
}

export const handler = commonMiddleware(getAuctions).use(
    validator({
        eventSchema: transpileSchema(getAuctionsSchema, {
            useDefaults: true,
        }),
    })
);
