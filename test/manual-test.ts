import { app } from './server';

const PORT = 3000;

app.listen(PORT, () => {
    console.log(`Test server is listening on port ${PORT}`);
});
