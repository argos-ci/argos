import ShallowWrapper from 'enzyme/ShallowWrapper'
import until from '../operator/until'

ShallowWrapper.prototype.until = until
