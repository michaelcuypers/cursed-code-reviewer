// Application-wide types

export interface NavigationItem {
  path: string;
  label: string;
  icon: string;
}

export interface AppConfig {
  apiEndpoint: string;
  awsRegion: string;
}
