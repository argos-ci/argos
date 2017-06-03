import os
import sys
from django.conf import settings

class SeleniumScreenShotMixin(object):
  def take_screenshot(self):
    filename = '{folder}/{classname}-{method}.png'.format(
      folder=os.path.join(settings.BASE_DIR, 'screenshots'),
      classname=self.__class__.__name__,
      method=self._testMethodName
    )
    self.browser.get_screenshot_as_file(filename)

  def tearDown(self):
    self.browser.quit()
