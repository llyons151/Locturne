Pod::Spec.new do |s|
  s.name           = 'ProgressBackup'
  s.version        = '1.0.0'
  s.summary        = 'Keeps the morning count, proofs and moons in iCloud key-value storage and the Keychain, so a reinstall gets them back.'
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
