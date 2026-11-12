Pod::Spec.new do |s|
  s.name           = 'ReelFrame'
  s.version        = '1.0.0'
  s.summary        = 'Dev and preview builds: squeezes the app window into a 9:16 box for recording Reels.'
  s.author         = 'Locturne'
  s.homepage       = 'https://github.com/llyons151/locturne'
  s.license        = 'MIT'
  s.platforms      = { :ios => '16.0' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
  }

  s.source_files = "**/*.{h,m,swift}"
end
