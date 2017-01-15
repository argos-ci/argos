import configureDatabase from 'server/bootstrap/configureDatabase';
import handleKillSignals from 'server/bootstrap/handleKillSignals';

handleKillSignals();
configureDatabase();
