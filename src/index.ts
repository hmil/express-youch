// We are only importing type definitions from express, therefore this import statement
// disappears after compilation.
import { NextFunction, Request, Response } from 'express';
import * as Http from 'http';
import * as Youch from 'youch';

/**
 * WARNING: public API. If this interface changes, then it is a BREAKING change (bump module major version).
 */
export interface IExceptionDescriptor {
    statusCode: number;
    name: string;
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
};

type ResponseFormat = 'json' | 'text' | 'html';

/**
 * An express-compatible middleware to catch all errors.
 *
 * Use like this:
 *
   ```ts
   import { errorReporter } from 'express-youch';

   app.use(errorReporter());
   ```
 */
export function errorReporter() {
    return (err: IReceivedError, req: Request, res: Response, next: NextFunction) => {
        if (res.headersSent) {
            return next(err);
        }
        const descriptor = applyDefaults(createErrorDescriptor(err));
        sendException(req, res, descriptor).then(() => next(descriptor));
    };
}

/**
 * Converts an unknown error type into a precise description of the error that
 * we can easily report.
 */
function createErrorDescriptor(err: IReceivedError): Partial<IExceptionDescriptor> {
    return {
        name: 'constructor' in err ? err.constructor.name : 'name' in err ? err.name : undefined,
        message: 'message' in err ? err.message : safeToString(err),
        stack: 'stack' in err ? err.stack : undefined,
        statusCode: extractStatusCode(err)
    };
}

function applyDefaults(descriptor: Partial<IExceptionDescriptor>): IExceptionDescriptor {
    const status = descriptor.statusCode || 500;
    return {
        name: descriptor.name || 'Unknown error',
        message: descriptor.message || Http.STATUS_CODES[status] || '',
        stack: isRunningInProd() ? '' : (descriptor.stack || ''), // Strip the stack trace in prod
        statusCode: status
    };
}

/**
 * Reports the description of an error back to the user while respecting the 'Accept' header if possible.
 */
async function sendException(req: Request, res: Response, err: IExceptionDescriptor): Promise<void> {
    switch (getPreferredResponseFormat(req)) {
        case 'json':
            res.status(err.statusCode).json(err);
            break;
        case 'text':
            res.status(err.statusCode).contentType('text/plain').send(formatTextResponse(err));
            break;
        case 'html':
            if (!isRunningInProd()) {
                return sendYouchError(req, res, err);
            }
            // If the app is running in prod, we let the next middleware down the stack decide how
            // to print the error.
            // This will usually allow a user to provide their own nice customized error pages.
            break;
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

function sendYouchError(req: Request, res: Response, err: IExceptionDescriptor): Promise<void> {
    const youch = new Youch(err, req);
    return youch.toHTML()
        .then((html: string) => {
            res.writeHead(err.statusCode, {'content-type': 'text/html'});
            res.write(html);
            res.end();
        });
}

function formatTextResponse(err: IExceptionDescriptor): string {
    return err.name + ': ' + (err.message ? err.message : 'Unknown error') + '\n' + (err.stack ? err.stack : '');
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
    } catch (e) {
        return undefined;
    }
}

function isRunningInProd() {
    return process.env.NODE_ENV === 'production';
}
