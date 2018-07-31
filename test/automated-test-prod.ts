import { expect } from 'chai';
import { Request, Response } from 'express';
import * as request from 'supertest';

import { app } from './server';

app.use((err: any, req: Request, res: Response, next: any) => {
    // silences errors in the console
});

describe('404 error', () => {
    it('Is shown as plain text by default', async () => {
        const response = await request(app)
                .get('/doesnotexist')
                .expect(404)
                .expect('Content-Type', 'text/plain; charset=utf-8');
        expect(response.text).to.match(
            /^NotFoundHttpException: Not Found\n$/);
    });

    it('Is shown as json when asked for json', async () => {
        const response = await request(app)
                .get('/doesnotexist')
                .set('Accept', 'application/json')
                .expect(404)
                .expect('Content-Type', 'application/json; charset=utf-8');
        expect(response.body.name).to.equal('NotFoundHttpException');
        expect(response.body.message).to.equal('Not Found');
        expect(response.body.statusCode).to.equal(404);
        expect(response.body.stack).to.equal('');
    });

    it('Is shown as html when asked for html', async () => {
        const response = await request(app)
                .get('/doesnotexist')
                .set('Accept', 'text/html')
                .expect(404)
                .expect('Content-Type', 'text/html; charset=utf-8');

        const custom = findInText(response.text, /<h1>(.+)<\/h1>/).trim();
        expect(custom).to.equal('404 Not Found');
    });
});

describe('Manual error', () => {
    it('Is shown as plain text by default', async () => {
        const response = await request(app)
                .get('/error')
                .expect(501)
                .expect('Content-Type', 'text/plain; charset=utf-8');
        expect(response.text).to.match(
            /^NotImplementedHttpException: Not Implemented\n$/);
    });

    it('Is shown as json when asked for json', async () => {
        const response = await request(app)
                .get('/error')
                .set('Accept', 'application/json')
                .expect(501)
                .expect('Content-Type', 'application/json; charset=utf-8');
        expect(response.body.name).to.equal('NotImplementedHttpException');
        expect(response.body.message).to.equal('Not Implemented');
        expect(response.body.statusCode).to.equal(501);
        expect(response.body.stack).to.be.equal('');
    });

    it('Is shown as html when asked for html', async () => {
        const response = await request(app)
                .get('/error')
                .set('Accept', 'text/html')
                .expect(501)
                .expect('Content-Type', 'text/html; charset=utf-8');

        const custom = findInText(response.text, /<h1>(.+)<\/h1>/).trim();
        expect(custom).to.equal('501 Not Implemented');
    });
});

function findInText(text: string, rx: RegExp): string {
    const match = text.match(rx);
    if (match == null) {
        throw new Error(`Pattern found: ${rx}`);
    }
    return match[1];
}
