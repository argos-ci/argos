# frozen_string_literal: true

module UiTweakHelper
  def blur_everything
    page.execute_script <<EOL
  if ('activeElement' in document) {
    document.activeElement.blur()
  }
EOL
    yield
  end

  def hide_scrollbar
    page.execute_script <<EOL
  const css = '::-webkit-scrollbar { display: none }'
  const style = document.createElement('style')
  style.id = 'capybara-no-scroll-bar'
  style.type = 'text/css'
  style.appendChild(document.createTextNode(css))
  document.head.appendChild(style)
EOL
    yield
    page.execute_script <<EOL
  const style = document.getElementById('capybara-no-scroll-bar')
  document.head.removeChild(style)
EOL
  end

  def disable_css_animations
    page.execute_script <<EOL
  const css = `
    * {
      -webkit-transition-duration: 0s !important;
      transition-duration: 0s !important;

      -webkit-animation: none !important;
      animation: none !important;
    }
  `
  const style = document.createElement('style')
  style.id = 'capybara-no-css-animations'
  style.type = 'text/css'
  style.appendChild(document.createTextNode(css))
  document.head.appendChild(style)
EOL
    yield
    page.execute_script <<EOL
  const style = document.getElementById('capybara-no-css-animations')
  document.head.removeChild(style)
EOL
  end

  def disable_flaky_styles
    page.execute_script <<EOL
  const css = `
    .snapshot-hide {
      visibility: hidden !important
    }
    .snapshot-background-none {
      background: none !important
    }
  `
  const style = document.createElement('style')
  style.id = 'capybara-disable-flaky-styles'
  style.type = 'text/css'
  style.appendChild(document.createTextNode(css))
  document.head.appendChild(style)
EOL
    yield
    page.execute_script <<EOL
  const style = document.getElementById('capybara-disable-flaky-styles')
  document.head.removeChild(style)
EOL
  end
end
