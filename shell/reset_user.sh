#!/usr/bin/env bash

## 重置用户账号密码脚本
## 执行后会清除登录信息，重启容器后进入初始化页面重新设置账号密码

dir_root=$QL_DIR
dir_data=$dir_root/data

if [[ ${QL_DATA_DIR:=} ]]; then
  dir_data="${QL_DATA_DIR%/}"
fi

dir_config=$dir_data/config
dir_db=$dir_data/db

echo -e "=====> 开始重置用户信息\n"

# 1. 删除认证配置文件
echo -e "---> 1. 删除认证配置文件"
for f in "$dir_config/auth.json" "$dir_config/token.json"; do
  if [[ -f "$f" ]]; then
    rm -f "$f"
    echo -e "    已删除 $f"
  else
    echo -e "    $f 不存在，跳过"
  fi
done
echo

# 2. 删除 keyv 数据库
echo -e "---> 2. 删除 keyv 数据库"
if [[ -f "$dir_db/keyv.sqlite" ]]; then
  rm -f "$dir_db/keyv.sqlite"
  echo -e "    已删除 $dir_db/keyv.sqlite"
else
  echo -e "    $dir_db/keyv.sqlite 不存在，跳过"
fi
echo

# 3. 检查并安装 sqlite
echo -e "---> 3. 检查 sqlite 是否已安装"
if ! command -v sqlite3 &>/dev/null; then
  echo -e "    sqlite3 未安装，开始安装..."
  apk add --no-cache sqlite
  echo -e "    sqlite3 安装完成"
else
  echo -e "    sqlite3 已安装"
fi
echo

# 4. 删除 Auths 表
echo -e "---> 4. 清除数据库中的认证信息"
local_db="$dir_db/database.sqlite"
if [[ -f "$local_db" ]]; then
  sqlite3 "$local_db" "DROP TABLE IF EXISTS Auths;"
  echo -e "    已删除 Auths 表"
else
  echo -e "    $local_db 不存在，跳过"
fi
echo

# 5. 重启容器
echo -e "=====> 重置完成，正在重启容器...\n"
echo -e "重启后请访问面板重新设置账号密码\n"
sleep 1
reboot
