Pod::Spec.new do |s|
  s.name = 'ScreenTimeReport'
  s.version = '1.0.0'
  s.summary = 'Privacy-preserving Screen Time report on Home.'
  s.author = 'Locturne'
  s.homepage = 'https://github.com/llyons151/locturne'
  s.license = 'MIT'
  s.platforms = { :ios => '16.4' }
  s.swift_version = '5.9'
  s.source = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = '**/*.swift'
end
