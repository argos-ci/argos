/* eslint-disable global-require */
import 'rxjs/add/observable/of'

import 'rxjs/add/operator/delay'
import 'rxjs/add/operator/mapTo'
import 'rxjs/add/operator/do'
import 'rxjs/add/operator/map'
import 'rxjs/add/operator/filter'
import 'rxjs/add/operator/combineLatest'
import 'rxjs/add/operator/take'
import 'rxjs/add/operator/merge'
import 'rxjs/add/operator/catch'
import 'rxjs/add/operator/startWith'
import 'rxjs/add/operator/switchMap'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/debounceTime'
import 'rxjs/add/operator/withLatestFrom'
import 'modules/rxjs/add/operator/watchTask'

import { BehaviorSubject } from 'rxjs/BehaviorSubject'
import { Observable } from 'rxjs/Observable'
import { Subject } from 'rxjs/Subject'

if (process.env.NODE_ENV !== 'production') {
  require('modules/rxjs/add/operator/debug')
}

export { BehaviorSubject, Observable, Subject }
