require 'application_system_test_case'

class ScreenshotTest < ApplicationSystemTestCase
  test 'visiting the index' do
    visit 'https://github.com/argos-ci/argos/'
    sleep 2
    snapshot('homepage')
  end
end
