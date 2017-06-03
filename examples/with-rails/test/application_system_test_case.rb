require 'test_helper'
require 'ui_tweak_helper'

class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  include UiTweakHelper

  Capybara.always_include_port = false
  driven_by :selenium, using: :chrome, screen_size: [1200, 800], options: {
    url: "http://localhost:4444/wd/hub"
  }

  def snapshot(name)
    sleep_duration = 0.3
    path = "#{Rails.root}/screenshots"
    FileUtils.mkdir_p(path)
    blur_everything do
      hide_scrollbar do
        disable_flaky_styles do
          disable_css_animations do
            sleep(sleep_duration)
            page.driver.save_screenshot "#{path}/#{name}.png"
          end
        end
      end
    end
  rescue StandardError => e
    puts "Caught an exception in ActionDispatch::IntegrationTest#report: #{e.message}"
  end
end
