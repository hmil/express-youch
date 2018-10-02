// We are only importing type definitions from express, therefore this import statement
// disappears after compilation.
import { NextFunction, Request, Response } from 'express';
import * as Http from 'http';
import * as Youch from 'youch';

/**
 * WARNING: public API. If this interface changes, then it is a BREAKING change (bump module major version).
 */
export class NormalizedException {
    constructor(
            public readonly statusCode: number,
            public readonly name: string,
            public readonly message: string,
            public readonly stack?: any) {
    }

    public toString() {
        return formatTextResponse(this);
    }
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
interface ErrorReporterOptions {
    addStackOverflowLink?: boolean;
}

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
export function errorReporter(options?: ErrorReporterOptions) {
    return (err: IReceivedError, req: Request, res: Response, next: NextFunction) => {
        if (res.headersSent) {
            return next(err);
        }
        const normalized = createErrorDescriptor(err);
        sendException(
            req,
            res,
            stripProductionAttributes(normalized),
            options
        ).then(() => next(normalized));
    };
}

function stripProductionAttributes(exception: NormalizedException) {
    return new NormalizedException(
        exception.statusCode,
        exception.name,
        exception.message,
        isRunningInProd() ? '' : exception.stack
    );
}

/**
 * Converts an unknown error type into a precise description of the error that
 * we can easily report.
 */
function createErrorDescriptor(err: IReceivedError): NormalizedException {
    const maybeMessage = 'message' in err ? err.message : safeToString(err);
    const status = extractStatusCode(err);
    return new NormalizedException(
        status,
        'constructor' in err ? err.constructor.name : 'name' in err && err.name != null ? err.name : 'Unknown error',
        maybeMessage ? maybeMessage : Http.STATUS_CODES[status] || '',
        'stack' in err ? err.stack : undefined,
    );
}

/**
 * Reports the description of an error back to the user while respecting the 'Accept' header if possible.
 */
async function sendException(
  req: Request,
  res: Response,
  err: NormalizedException,
  options?: ErrorReporterOptions
): Promise<void> {
    switch (getPreferredResponseFormat(req)) {
        case 'json':
            res.status(err.statusCode).json(err);
            break;
        case 'text':
            res.status(err.statusCode).contentType('text/plain').send(formatTextResponse(err));
            break;
        case 'html':
            if (!isRunningInProd()) {
        return sendYouchError(req, res, err, options);
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

function sendYouchError(
  req: Request,
  res: Response,
  err: NormalizedException,
  options?: ErrorReporterOptions
): Promise<void> {
    const youch = new Youch(err, req);
    const asHtml =
        options && options.addStackOverflowLink
        ? youch.addLink(createStackOverflowLink).toHTML()
        : youch.toHTML();
    return asHtml.then((html: string) => {
        res.writeHead(err.statusCode, { 'content-type': 'text/html' });
        res.write(html);
        res.end();
    });
}

function formatTextResponse(err: NormalizedException): string {
    return err.name + ': ' + (err.message ? err.message : 'Unknown error') + '\n' + (err.stack ? err.stack : '');
}

function extractStatusCode(err: IReceivedError): number {
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
    return 500;
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

function safeToString(err: any): string {
    try {
        return err.toString();
    } catch (e) {
        return '';
    }
}

function isRunningInProd() {
    return process.env.NODE_ENV === 'production';
}

function createStackOverflowLink(error: { message: string }): string {
    const url = `https://stackoverflow.com/search?q=${encodeURIComponent(
        error.message
    )}`;
    return `<a href="${url}" style="color: gray" target="_blank" title="Search for error message on stackoverflow">stackoverflow</a>`;
}
