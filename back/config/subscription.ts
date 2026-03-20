import { Subscription } from '../data/subscription';
import isNil from 'lodash/isNil';

// 转义双引号内的字符串，防止命令注入
function escapeDoubleQuoted(str: string): string {
  return str.replace(/["\\$`!]/g, '\\$&');
}

export function formatUrl(doc: Subscription) {
  let url = doc.url;
  let host = '';
  if (doc.type === 'private-repo') {
    if (doc.pull_type === 'ssh-key') {
      host = doc.url!.replace(/.*\@([^\:]+)\:.*/, '$1');
      url = doc.url!.replace(host, doc.alias);
    } else {
      host = doc.url!.replace(/.*\:\/\/([^\/]+)\/.*/, '$1');
      const { username, password } = doc.pull_option as any;
      url = doc.url!.replace(host, `${username}:${password}@${host}`);
    }
  }
  return { url, host };
}

export function formatCommand(doc: Subscription, url?: string) {
  let command = `SUB_ID=${doc.id} ql `;
  let _url = url || formatUrl(doc).url;
  const {
    type,
    whitelist,
    blacklist,
    dependences,
    branch,
    extensions,
    proxy,
    autoAddCron,
    autoDelCron,
  } = doc;
  if (type === 'file') {
    command += `raw "${escapeDoubleQuoted(_url || '')}" "${escapeDoubleQuoted(proxy || '')}" "${
      isNil(autoAddCron) ? true : Boolean(autoAddCron)
    }" "${isNil(autoDelCron) ? true : Boolean(autoDelCron)}"`;
  } else {
    command += `repo "${escapeDoubleQuoted(_url || '')}" "${escapeDoubleQuoted(whitelist || '')}" "${escapeDoubleQuoted(blacklist || '')}" "${
      escapeDoubleQuoted(dependences || '')
    }" "${escapeDoubleQuoted(branch || '')}" "${escapeDoubleQuoted(extensions || '')}" "${escapeDoubleQuoted(proxy || '')}" "${
      isNil(autoAddCron) ? true : Boolean(autoAddCron)
    }" "${isNil(autoDelCron) ? true : Boolean(autoDelCron)}"`;
  }
  return command;
}
