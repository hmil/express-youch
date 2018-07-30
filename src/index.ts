// We are only importing type definitions from express, therefore this import statement
// disappears after compilation.
import { NextFunction, Request, Response } from 'express';
import * as Http from 'http';

import * as Youch from 'youch';

/**
 * WARNING: public API. If this interface changes, then it is a BREAKING change (bump module major version).
 */
interface IExceptionDescriptor {
    statusCode: number;
    message: string;
    stack?: any;
}

/**
 * Loose type to define interesting properties we may find in errors we get
 */
type IReceivedError = Partial<Error> & string & {
    statusCode?: number | string;
    code?: number | string;
    status?: number | string;
}

type ResponseFormat = 'json' | 'text' | 'html';

export interface IMiddlewareConfig {
    prod: boolean;
}

/**
 * An express-compatible middleware to catch all errors.
 *
 * Use like this:
 *
   ```ts
   import { errorReporter } from 'express-youch';
   
   app.use(errorReporter({
       prod: process.env.NODE_ENV === 'production'
   }));
   ```
 */
export function errorReporter(config: IMiddlewareConfig) {
    return (err: IReceivedError, req: Request, res: Response, next: NextFunction) => {
        if (res.headersSent || config.prod !== false) {
            return next(err);
        }
        const descriptor = applyDefaults(createErrorDescriptor(err));
        sendException(req, res, descriptor);
    }
}

/**
 * Converts an unknown error type into a precise description of the error that
 * we can easily report.
 */
function createErrorDescriptor(err: IReceivedError): Partial<IExceptionDescriptor> {
    return {
        message: 'message' in err ? err.message : safeToString(err),
        stack: 'stack' in err ? err.stack : undefined,
        statusCode: extractStatusCode(err)
    };
}

function applyDefaults(descriptor: Partial<IExceptionDescriptor>): IExceptionDescriptor {
    const status = descriptor.statusCode || 500;
    return {
        message: descriptor.message || Http.STATUS_CODES[status] || 'Unknown error',
        stack: descriptor.stack || '',
        statusCode: status
    };
}

/**
 * Reports the description of an error back to the user while respecting the 'Accept' header if possible.
 */
function sendException(req: Request, res: Response, err: IExceptionDescriptor): Response {
    switch (getPreferredResponseFormat(req)) {
        case 'json':
            return res.status(err.statusCode).json(err);
        case 'text':
            return res.status(err.statusCode).contentType('text/plain').send(formatTextResponse(err));
        case 'html':
            return sendYouchError(req, res, err);
    }
}

/**
 * Figures out what response format is the most appropriate given some request.
 */
function getPreferredResponseFormat(req: Request): ResponseFormat {
    const acceptHeader = req.header('Accept');
    if (acceptHeader != null) {
        if (acceptHeader.indexOf('application/json') !== -1) {
            return 'json';
        } else if (acceptHeader.indexOf('text/html') !== -1) {
            return 'html';
        }
    }
    return 'text';
}

function sendYouchError(req: Request, res: Response, err: IExceptionDescriptor) {
    const youch = new Youch(err, req)
    youch.toHTML()
        .then((html: string) => {
            res.writeHead(err.statusCode, {'content-type': 'text/html'})
            res.write(html)
            res.end()
        });
    return res;
}

function formatTextResponse(err: IExceptionDescriptor): string {
    return (err.message ? err.message : 'Unknown error') + '\n' + (err.stack ? err.stack : '');
}

function extractStatusCode(err: IReceivedError): number | undefined {
    let status: number | undefined;
    if ('statusCode' in err && (status = validateStatusCode(err.statusCode))) {
        return status;
    }
    if ('status' in err && (status = validateStatusCode(err.status))) {
        return status;
    }
    if ('code' in err && (status = validateStatusCode(err.code))) {
        return status;
    }
}

function validateStatusCode(code: string | number | undefined): number | undefined {
    if (code == null) {
        return;
    }
    const status = safeToNumber(code);

     // Loose sanity check to avoid capturing stuff that's not an HTTP status code
    if (status != null && status >= 400 && status < 600) {
        return status;
    }
}

function safeToNumber(status: string | number): number | undefined {
    if (typeof status === 'number') {
        return status;
    }
    try {
        return parseInt(status, 10);
    } catch (e) {
        return undefined;
    }
}

function safeToString(err: any): string | undefined {
    try {
        return err.toString();
    } catch(e) {
        return undefined;
    }
}