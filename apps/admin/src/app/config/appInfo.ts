import {
  APP_NAME,
  SUPERTOKENS_API_BASE_PATH,
  SUPERTOKENS_WEBSITE_BASE_PATH,
} from '@/app/constants';

import { publicEnv } from './env.public';

export const appInfo = {
  appName: APP_NAME,
  apiDomain: publicEnv.appOrigin,
  websiteDomain: publicEnv.appOrigin,
  apiBasePath: SUPERTOKENS_API_BASE_PATH,
  websiteBasePath: SUPERTOKENS_WEBSITE_BASE_PATH,
};
