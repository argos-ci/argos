import { connect } from 'server/database';
import handleKillSignals from 'server/bootstrap/handleKillSignals';

handleKillSignals();
connect();
