#!groovy
pipeline {
    agent any
    /**
     * 本脚本(Jenkinsfile)作用：
     * 1. 替换环境参数
     * 2. pnpm 构建： 安装前端项目依赖，并将项目打包为金泰之源
     * 3. 压缩：将打包好的 dist 压缩成tgz包
     * 4. 推送压缩包并执行脚本：将tgz包推送到服务器，并让服务器执行 server_node_run.sh 脚本
     *
     * server_node_run.sh 脚本需要提前存放在 目标服务器的指定路径： ${WORKSPACE_HOME}/bin/
     * server_node_run.sh 脚本的作用：
     * 1. 备份上次的dist文件
     * 2. 解压 tgz压缩包
     * 3. 将新解压出的dist替换原来的dist目录
     *
     * Jenkinsfile和server_node_run.sh 的作用只是将打包后的页面放到目标服务器的指定位置，
     * 浏览器访问需要配合nginx等web服务器！
     */
    environment {
        // jenkins 上动态配置的参数
        // SERVER_SSH_HOST: 推送到那台服务器
        // MODE: 租户模式 none、column、datasource-column

        // 根据项目或部署服务器 可能需要更改一次的变量
        // jar名
        JAR_NAME = "lamp-web-pro"

        // 以下变量基本不变
        // 推送到服务器端的文件夹路径
        remoteDirectory = "./temp_jar/"

        // 推送时需要忽略的项目前缀
        removePrefix = ""

        // 需要推送到服务器端的文件(jar)
        sourceFiles = "${JAR_NAME}.tgz"
    }

    stages {
        stage('替换环境参数') {
            steps {
                script {
                    PROFILES_ARR = "${SERVER_SSH_HOST}".split('_')
                    PROFILES = PROFILES_ARR[1]

                    WORKSPACE_HOME = "/data_${PROFILES}"

                    // 服务端执行的脚本
                    EXEC_COMMAND = "bash -x -s < ${WORKSPACE_HOME}/bin/server_node_run.sh ${JAR_NAME} ${PROFILES}"

                    echo "您选择了如下参数："
                    echo "拉取分支： ${branch}, 是否执行yarn install:  ${IS_INSTALL}, 打包环境：${PROFILES}, 推送至：${SERVER_SSH_HOST}"
                }
            }
        }

        stage('pnpm 构建') {
            steps {
                script {
                    echo "是否执行 pnpm install:  ${IS_INSTALL}"
                    if("${IS_INSTALL}" == "true") {
                        sh 'rm -rf pnpm-lock.yaml && rm -rf node_modules'
                        sh "pnpm install --registry=https://registry.npmmirror.com"
                    }
                }
                sh "pnpm run fix-memory-limit"
                sh "pnpm build:${PROFILES}"
            }
        }

        stage('压缩') {
            steps {
                sh "mkdir -p ./${JAR_NAME}"
                sh "mv dist ./${JAR_NAME}"
                sh "tar -zcvf ${JAR_NAME}.tgz ${JAR_NAME}"
            }
        }

        stage('推送压缩包并执行脚本') {
            steps {
                sshPublisher(publishers: [sshPublisherDesc(configName: "${SERVER_SSH_HOST}", transfers: [sshTransfer(cleanRemote: false, excludes: '', execCommand: "${EXEC_COMMAND}", execTimeout: 120000, flatten: false, makeEmptyDirs: false, noDefaultExcludes: false, patternSeparator: '[, ]+', remoteDirectory: "${remoteDirectory}", remoteDirectorySDF: false, removePrefix: "", sourceFiles: "${sourceFiles}")], usePromotionTimestamp: false, useWorkspaceInPromotion: false, verbose: false)])

                sh "rm -rf ./${JAR_NAME}"
            }
        }
    }

}


