import os
import time

def take_screenshot(selenium, name):
  filename = '{folder}/{name}.png'.format(
    folder=os.path.join(os.path.dirname(__file__), '../screenshots'),
    name=name
  )
  selenium.get_screenshot_as_file(filename)

def test_example(selenium):
  # Some documentation
  # https://selenium-python.readthedocs.io/getting-started.html
  selenium.get('https://github.com/argos-ci/argos')
  time.sleep(2)
  take_screenshot(selenium, 'homepage')
