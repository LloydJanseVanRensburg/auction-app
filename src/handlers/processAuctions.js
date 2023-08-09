import createHttpError from 'http-errors';
import { closeAuction } from '../lib/closeAuction.js';
import { getEndedAuctions } from '../lib/getEndedAuctions.js';

async function processAuctions(event, context) {
    try {
        const auctionsToClose = await getEndedAuctions();

        const closePromises = auctionsToClose.map((auction) =>
            closeAuction(auction)
        );

        await Promise.all(closePromises);

        return { closed: closePromises.length };
    } catch (error) {
        console.error(error);
        throw new createHttpError.InternalServerError(error);
    }
}

export const handler = processAuctions;
