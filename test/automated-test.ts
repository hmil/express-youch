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
            /^NotFoundHttpException: Not Found\nError: Not Found\n    at exports.app.use \(.+(\/|\\)test(\/|\\)server.ts:\d+:\d+\)(\n    at .+ \(.+\.js:\d+:\d+\))+/);
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
        expect(response.body.stack).to.match(
            /Error: Not Found\n    at exports.app.use \(.+(\/|\\)test(\/|\\)server.ts:\d+:\d+\)(\n    at .+ \(.+\.js:\d+:\d+\))+/);
    });

    it('Is shown as html when asked for html', async () => {
        const response = await request(app)
                .get('/doesnotexist')
                .set('Accept', 'text/html')
                .expect(404)
                .expect('Content-Type', 'text/html');

        const eName = findInText(response.text, /<h4 class="error-name">(.+)<\/h4>/).trim();
        const eMessage = findInText(response.text, /<h2 class="error-message">(.+)<\/h2>/).trim();

        expect(eName).to.equal('NotFoundHttpException');
        expect(eMessage).to.equal('Not Found');
    });
});

describe('Manual error', () => {
    it('Is shown as plain text by default', async () => {
        const response = await request(app)
                .get('/error')
                .expect(501)
                .expect('Content-Type', 'text/plain; charset=utf-8');
        expect(response.text).to.match(
            /^NotImplementedHttpException: Not Implemented\nError\n    at router.get \(.+(\/|\\)test(\/|\\)server.ts:\d+:\d+\)(\n    at .+ \(.+\.js:\d+:\d+\))+/);
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
        expect(response.body.stack).to.match(
            /Error\n    at router.get \(.+(\/|\\)test(\/|\\)server.ts:\d+:\d+\)(\n    at .+ \(.+\.js:\d+:\d+\))+/);
    });

    it('Is shown as html when asked for html', async () => {
        const response = await request(app)
                .get('/error')
                .set('Accept', 'text/html')
                .expect(501)
                .expect('Content-Type', 'text/html');

        const eName = findInText(response.text, /<h4 class="error-name">(.+)<\/h4>/).trim();
        const eMessage = findInText(response.text, /<h2 class="error-message">(.+)<\/h2>/).trim();

        expect(eName).to.equal('NotImplementedHttpException');
        expect(eMessage).to.equal('Not Implemented');
    });
});

function findInText(text: string, rx: RegExp): string {
    const match = text.match(rx);
    if (match == null) {
        throw new Error(`Pattern found: ${rx}`);
    }
    return match[1];
}
