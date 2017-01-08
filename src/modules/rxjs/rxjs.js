import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/mapTo';
import 'rxjs/add/operator/do';
import 'modules/rxjs/add/operator/watchTask';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/catch';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/switchMap';

if (process.env.NODE_ENV !== 'production') {
  require('modules/rxjs/add/operator/debug');
}

