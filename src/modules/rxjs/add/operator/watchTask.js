import { Observable } from 'rxjs/Observable'
import { watchTask } from 'modules/rxjs/operator/watchTask'

Observable.prototype.watchTask = watchTask
