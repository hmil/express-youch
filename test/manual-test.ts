import { app } from './server';

const PORT = 3000;

app.listen(PORT, () => {
    // tslint:disable-next-line:no-console
    console.log(`Test server is listening on port ${PORT}`);
});
