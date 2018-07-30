import * as express from 'express';
import { errorReporter } from '../';
import { NotFoundHttpException, NotImplementedHttpException } from '@senhung/http-exceptions';
import * as path from 'path';

const app = express();

const router = express.Router();

router.get('/error', (req, res, next) => next(new NotImplementedHttpException()));

app.use(router);
app.use(express.static(path.join(__dirname, 'static')));
app.use((req, res, next) => {
    next(new NotFoundHttpException("Not Found"));
});

app.use(errorReporter({
    prod: process.env.NODE_ENV === 'production'
}));

app.listen(3000, () => console.log('Example app listening on port 3000!'));
