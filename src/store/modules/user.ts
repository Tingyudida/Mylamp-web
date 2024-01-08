import type { DefUserInfoResultVO } from '/#/store';
import type { ErrorMessageMode } from '/#/axios';
import { defineStore } from 'pinia';
import { store } from '/@/store';
import { RoleEnum } from '/@/enums/roleEnum';
import { PageEnum } from '/@/enums/pageEnum';
import {
  APPLICATION_ID_KEY,
  APPLICATION_NAME_KEY,
  EXPIRE_TIME_KEY,
  REFRESH_TOKEN_KEY,
  ROLES_KEY,
  TOKEN_KEY,
  USER_INFO_KEY,
} from '/@/enums/cacheEnum';
import { getAuthCache, setAuthCache } from '/@/utils/auth';
import type { LoginParamVO, LogoutParams } from '/@/api/lamp/common/model/userModel';

import { getUserInfoById, loginApi, logout, switchTenantAndOrg } from '/@/api/lamp/common/oauth';
import { router } from '/@/router';
import { usePermissionStore } from '/@/store/modules/permission';
import { RouteRecordRaw } from 'vue-router';
import { PAGE_NOT_FOUND_ROUTE } from '/@/router/routes/basic';
import { useTabs } from '/@/hooks/web/useTabs';
import { useGlobSetting } from '/@/hooks/setting';

const globSetting = useGlobSetting();
const DEF_APP_ID = globSetting.defApplicationId;

interface UserState {
  userInfo: Nullable<DefUserInfoResultVO>;
  token?: string;
  roleList: RoleEnum[];
  sessionTimeout?: boolean;
  lastUpdateTime: number;
  refreshToken?: string;
  expireTime?: string;
  applicationId: string;
  applicationName: string;
}

export const useUserStore = defineStore({
  id: 'app-user',
  state: (): UserState => ({
    // user info
    userInfo: null,
    // token
    token: undefined,
    // roleList
    roleList: [],
    // Whether the login expired
    sessionTimeout: false,
    // Last fetch time
    lastUpdateTime: 0,
    refreshToken: '',
    expireTime: '',
    // 应用id
    applicationId: '',
    applicationName: '',
  }),
  getters: {
    // 当前用户信息
    getUserInfo(): DefUserInfoResultVO {
      return this.userInfo || getAuthCache<DefUserInfoResultVO>(USER_INFO_KEY) || {};
    },
    // 当前用户的Token
    getToken(): string {
      return this.token || getAuthCache<string>(TOKEN_KEY);
    },
    // 在lamp项目中没用
    getRoleList(): RoleEnum[] {
      return this.roleList.length > 0 ? this.roleList : getAuthCache<RoleEnum[]>(ROLES_KEY);
    },
    getSessionTimeout(): boolean {
      return !!this.sessionTimeout;
    },
    getLastUpdateTime(): number {
      return this.lastUpdateTime;
    },
    getRefreshToken(): string {
      return this.refreshToken || getAuthCache<string>(REFRESH_TOKEN_KEY);
    },
    getExpireTime(): string {
      return this.expireTime || getAuthCache<string>(EXPIRE_TIME_KEY);
    },
    // 当前应用ID
    getApplicationId(): string {
      return this.applicationId || getAuthCache<string>(APPLICATION_ID_KEY);
    },
    // 当前应用名称
    getApplicationName(): string {
      return this.applicationName || getAuthCache<string>(APPLICATION_NAME_KEY);
    },
  },
  actions: {
    setToken(info: string | undefined) {
      this.token = info ? info : ''; // for null or undefined value
      setAuthCache(TOKEN_KEY, info);
    },
    setRoleList(roleList: RoleEnum[]) {
      this.roleList = roleList;
      setAuthCache(ROLES_KEY, roleList);
    },
    setUserInfo(info: DefUserInfoResultVO | null) {
      this.userInfo = info;
      this.lastUpdateTime = new Date().getTime();
      setAuthCache(USER_INFO_KEY, info);
    },
    setSessionTimeout(flag: boolean) {
      this.sessionTimeout = flag;
    },
    setApplicationId(info: string) {
      this.applicationId = info;
      setAuthCache(APPLICATION_ID_KEY, info);
    },
    setApplicationName(info: string) {
      this.applicationName = info;
      setAuthCache(APPLICATION_NAME_KEY, info);
    },
    setExpireTime(info: string) {
      this.expireTime = info;
      setAuthCache(EXPIRE_TIME_KEY, info);
    },
    setRefreshToken(info: string) {
      this.refreshToken = info;
      setAuthCache(REFRESH_TOKEN_KEY, info);
    },
    resetState() {
      this.userInfo = null;
      this.token = '';
      this.roleList = [];
      this.sessionTimeout = false;
      this.expireTime = '';
      this.refreshToken = '';
      this.applicationId = '';
    },

    async switchTenantAndOrg(companyId: string, deptId: string) {
      try {
        const data = await switchTenantAndOrg(companyId, deptId);
        const { token, refreshToken, expiration } = data;
        // save token
        this.setToken(token);
        this.setRefreshToken(refreshToken);
        this.setExpireTime(expiration);

        this.setSessionTimeout(false);
        const permissionStore = usePermissionStore();
        permissionStore.resetState();
        const { closeAll } = useTabs(router);
        await closeAll();
        await router.replace(PageEnum.BASE_HOME);
        setTimeout(() => {
          location.reload();
        }, 200);
      } catch (error) {
        return Promise.reject(error);
      }
    },

    /**
     * @description: login
     */
    async login(
      params: LoginParamVO & {
        goHome?: boolean;
        mode?: ErrorMessageMode;
      },
    ): Promise<DefUserInfoResultVO | null> {
      try {
        const { goHome = true, mode, ...loginParams } = params;
        const data = await loginApi(loginParams, mode);
        const { token,  refreshToken, expiration } = data;

        // save token
        this.setToken(token);
        this.setRefreshToken(refreshToken);
        this.setExpireTime(expiration);

        return this.afterLoginAction(mode, true, goHome);
      } catch (error) {
        return Promise.reject(error);
      }
    },

    async afterLoginAction(
      mode: ErrorMessageMode,
      isSetAppId = false,
      goHome?: boolean,
    ): Promise<DefUserInfoResultVO | null> {
      if (!this.getToken) return null;
      // get user info
      const userInfo = await this.getUserInfoAction(mode, isSetAppId);

      const sessionTimeout = this.sessionTimeout;
      if (sessionTimeout) {
        this.setSessionTimeout(false);
      } else {
        const permissionStore = usePermissionStore();
        if (!permissionStore.isDynamicAddedRoute) {
          const routes = await permissionStore.buildRoutesAction();
          routes.forEach((route) => {
            router.addRoute(route as unknown as RouteRecordRaw);
          });
          router.addRoute(PAGE_NOT_FOUND_ROUTE as unknown as RouteRecordRaw);
          permissionStore.setDynamicAddedRoute(true);
        }
        goHome && (await router.replace(userInfo?.homePath || PageEnum.BASE_HOME));
      }
      return userInfo;
    },

    // 刷新时加载用户信息
    async getUserInfoAction(
      mode: ErrorMessageMode = 'none',
      isSetAppId = false,
    ): Promise<DefUserInfoResultVO> {
      const userInfo = await getUserInfoById(mode);
      this.setUserInfo(userInfo);
      if (isSetAppId) {
        this.setApplicationId(userInfo?.defApplication?.id ?? DEF_APP_ID);
        this.setApplicationName(userInfo?.defApplication?.name ?? '');
      }
      return userInfo;
    },
    /**
     * @description: logout
     */
    async logout(goLogin = false) {
      if (this.getToken) {
        const param: LogoutParams = {
          token: this.getToken,
        };
        await logout(param).finally(() => {
          this.setToken('');
          this.setSessionTimeout(false);
          goLogin && router.push(PageEnum.BASE_LOGIN);
        });
      } else {
        this.setToken('');
        this.setSessionTimeout(false);
        goLogin && router.push(PageEnum.BASE_LOGIN);
      }
    },
  },
});

// Need to be used outside the setup
export function useUserStoreWithOut() {
  return useUserStore(store);
}
