import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';

const generatePolicy = (principalId, methodArn) => {
    const apiGatewayWildcard = methodArn.split('/', 2).join('/') + '/*';

    return {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: 'Allow',
                    Resource: apiGatewayWildcard,
                },
            ],
        },
    };
};

export async function handler(event, context) {
    if (!event.headers.authorization) {
        throw new createHttpError.Unauthorized();
    }

    const token = event.headers.authorization.replace('Bearer ', '');

    try {
        const claims = jwt.verify(token, process.env.AUTH0_PUBLIC_KEY);
        const policy = generatePolicy(claims.sub, event.routeArn);

        return {
            ...policy,
            context: claims,
        };
    } catch (error) {
        console.error(error);
        throw new createHttpError.Unauthorized();
    }
}
