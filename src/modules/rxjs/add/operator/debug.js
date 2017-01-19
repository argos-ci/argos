import { Observable } from 'rxjs/Observable'
import { debug } from 'modules/rxjs/operator/debug'

Observable.prototype.debug = debug
