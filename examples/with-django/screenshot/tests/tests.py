import time
from selenium import webdriver
from selenium.webdriver.common.desired_capabilities import DesiredCapabilities
from screenshot.tests.mixins import SeleniumScreenShotMixin
from django.contrib.staticfiles.testing import StaticLiveServerTestCase

class ScreenshotTestCase(SeleniumScreenShotMixin, StaticLiveServerTestCase):
  def setUp(self):
    # Some documentation
    # https://selenium-python.readthedocs.io/getting-started.html
    self.browser = webdriver.Remote(
      command_executor='http://127.0.0.1:4444/wd/hub',
      # desired_capabilities=DesiredCapabilities.CHROME
      desired_capabilities=DesiredCapabilities.FIREFOX
    )

  def test_user_registration(self):
    self.browser.get('https://github.com/argos-ci/argos')
    time.sleep(2)
    self.take_screenshot()
