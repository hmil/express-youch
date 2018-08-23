import { NotFoundHttpException, NotImplementedHttpException } from '@senhung/http-exceptions';
import * as express from 'express';
import * as path from 'path';

import { errorReporter, NormalizedException } from '../';

export const app = express();

app.set('views', path.join(__dirname, './views'));
app.set('view engine', 'ejs');

const router = express.Router();
router.get('/error', (req, res, next) => next(new NotImplementedHttpException()));
app.use(router);
app.use(express.static(path.join(__dirname, 'static')));
app.use((req, res, next) => {
    next(new NotFoundHttpException('Not Found'));
});

app.use(errorReporter());
app.use((error: NormalizedException, req: express.Request, res: express.Response, next: any) => {
    if (!res.headersSent) {
        res.status(error.statusCode).render('error-page', { error });
    } else {
        next(error);
    }
});
