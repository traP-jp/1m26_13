#!/usr/bin/env python3
"""Convert 50 saved research records into additive local MariaDB demo data."""
import argparse
import collections
import datetime as dt
import hashlib
import json
from pathlib import Path
import re
import subprocess
import tempfile
import uuid

ROOT = Path(__file__).resolve().parents[1]
TEAMS = {
    'SysAd班': 'infra', 'ゲーム班': 'programming', 'グラフィック班': 'design',
    'サウンド班': 'design', 'アルゴリズム班': 'algorithm', 'CTF班': 'security',
    'Kaggle班': 'programming',
}
PREFIX = 'demo-research-'
TODAY = dt.datetime.now(dt.timezone(dt.timedelta(hours=9))).date()


def text_sql(value):
    if value is None:
        return 'NULL'
    if isinstance(value, bool):
        return 'TRUE' if value else 'FALSE'
    if isinstance(value, int):
        return str(value)
    if isinstance(value, (dict, list)):
        value = json.dumps(value, ensure_ascii=False)
    return "CONVERT(X'" + str(value).encode().hex() + "' USING utf8mb4)"


def db(sql):
    # Use only this checkout's loopback-only compose database, never an arbitrary DSN.
    command = ['docker', 'compose', 'exec', '-T', 'mariadb', 'sh', '-c',
               'exec mariadb --default-character-set=utf8mb4 --batch --skip-column-names '
               '--user="$MARIADB_USER" --password="$MARIADB_PASSWORD" "$MARIADB_DATABASE"']
    return subprocess.run(command, cwd=ROOT, input=sql, text=True, check=True,
                          capture_output=True).stdout


def resource(item):
    labels = {'archiveVideo': '録画', 'repository': 'リポジトリ', 'exercise': '演習', 'liveStream': '配信'}
    title = item.get('title') or item.get('kind') or '資料'
    if item.get('kind') in labels:
        title = f"{labels[item['kind']]}：{title}"
    return {'title': title[:120], 'url': item['url']}


def split_material(items):
    material = next((item for item in items if item.get('kind') == 'material'), None)
    return (resource(material) if material else None,
            [resource(item) for item in items if item is not material])


def convert():
    rows = [json.loads(line) for line in (ROOT / 'workshop-research/data/workshops.jsonl').read_text().splitlines()]
    ordered = sorted(rows, key=lambda row: (-row['academicYear'], row['title']))
    explicit = [row for row in ordered if row.get('organizerSource') in TEAMS]
    selected = (explicit + [row for row in ordered if row not in explicit])[:50]
    future_teams = set()
    converted = []
    for row in selected:
        key = f"{row['academicYear']}:{row['title']}"
        actor = PREFIX + hashlib.sha256(key.encode()).hexdigest()[:24]
        team = row.get('organizerSource') if row.get('organizerSource') in TEAMS else None
        future = bool(team and team not in future_teams)
        if future:
            future_teams.add(team)
        first_date = TODAY + dt.timedelta(days=len(future_teams) + 1) if future else None
        occurrences = row.get('occurrences') or [{'title': '第1回（日程未登録）'}]
        description = row.get('description') or next((o.get('description') for o in occurrences if o.get('description')), '')
        note = 'ローカル表示確認用に調査データから変換。'
        if future:
            note += f" 日程は架空の開催予定です。原資料は{row['academicYear']}年度。"
        description = (description + '\n\n' + note).strip()
        all_resources = [r for r in row.get('resources') or [] if r.get('url', '').startswith(('http://', 'https://'))]
        occurrence_keys = {o.get('entityKey') for o in occurrences if o.get('entityKey')}
        lecture_resources = [r for r in all_resources if r.get('occurrenceEntityKey') not in occurrence_keys]
        material, resources = split_material(lecture_resources)
        source_links = [{'title': ('出典：' + (s.get('title') or '調査元'))[:120], 'url': s['url']}
                        for s in (row.get('sources') or [])[:2] if s.get('url')]
        resources += source_links
        organizer = next((o for o in row.get('organizers') or [] if o.get('kind') == 'group'), None)
        if team:
            organizer = {'kind': 'group', 'id': (organizer or {}).get('id') or str(uuid.uuid5(uuid.NAMESPACE_URL, 'demo-team:' + team)), 'groupName': team}
        elif row.get('organizers'):
            organizer = {k: row['organizers'][0][k] for k in ['kind', 'id']}
        title = row['title']
        field = TEAMS.get(team)
        if re.search(r'Web|web|Vue|React|Design Doc', title):
            field = 'web'
        if not field:
            field = 'programming'
        sessions = []
        for index, occurrence in enumerate(occurrences):
            linked = [r for r in all_resources if r.get('occurrenceEntityKey') == occurrence.get('entityKey') and occurrence.get('entityKey')]
            session_material, session_resources = split_material(linked)
            date = (first_date + dt.timedelta(days=index * 7)).isoformat() if future else occurrence.get('date')
            old_date = occurrence.get('date') or '未登録'
            session_description = occurrence.get('description') or ''
            if future:
                session_description += f'\n\n開催予定の表示確認用（架空の日程）。元の日程：{old_date}。'
                if occurrence.get('knoqUrl'):
                    session_resources.append({'title': '元の開催情報', 'url': occurrence['knoqUrl']})
            sessions.append({
                'name': (occurrence.get('title') or f'第{index + 1}回')[:200],
                'description': session_description.strip(), 'order': index,
                'date': date, 'startTime': occurrence.get('startTime') or ('18:00' if future else None),
                'location': ' / '.join(str((occurrence.get(v) or {}).get('value', '')) for v in ['offlineVenue', 'onlineVenue']).strip(' /')[:1000],
                'knoqUrl': None if future else occurrence.get('knoqUrl'),
                'instructorId': next((i.get('id') for i in occurrence.get('instructors') or [] if i.get('id')), None),
                'material': session_material, 'resources': session_resources,
            })
        converted.append({
            'actor': actor, 'sourceTitle': title, 'sourceYear': row['academicYear'],
            'name': (('【開催予定テスト】' if future else '') + title)[:200],
            'description': description, 'year': TODAY.year if future else row['academicYear'],
            'field': field, 'organizer': organizer, 'team': team, 'future': future,
            'introductory': row.get('isZeroToOne') is True or bool(re.search(r'入門|基礎|体験|はじめて|になろう', title)),
            'channel': (row.get('workshopChannel') or {}).get('id'),
            'material': material, 'resources': resources, 'sessions': sessions,
        })
    assert len(converted) == 50 and len({r['actor'] for r in converted}) == 50
    return converted


def insert(table, values):
    return f"INSERT INTO {table} ({', '.join(values)}) VALUES ({', '.join(text_sql(v) if not isinstance(v, SQL) else str(v) for v in values.values())});"


class SQL(str):
    pass


def statements(rows):
    sql = ['SET NAMES utf8mb4;', 'START TRANSACTION;']
    classes = {}
    for kind, label, body in [
        ('lecture_pre', '講習会の準備', '# 準備\n\n{{ lecture.name }}\n\n- [ ] 公開情報を確認する'),
        ('session_main', '開催の準備', '# 開催\n\n{{ session.name }}\n\n- [ ] 開催情報・資料を確認する'),
        ('lecture_post', '講習会の振り返り', '# 振り返り\n\n- [ ] 資料を整理する'),
    ]:
        cid = str(uuid.uuid5(uuid.NAMESPACE_URL, PREFIX + kind))
        classes[kind] = (cid, body)
        sql.append(insert('flow_classes', {'id': cid, 'name': 'テスト用：' + label, 'flow_type': kind,
            'text': body, 'format_version': 1, 'listed': True, 'revision': 1,
            'created_by': PREFIX + 'seed', 'updated_by': PREFIX + 'seed',
            'created_at': SQL('UTC_TIMESTAMP(6)'), 'updated_at': SQL('UTC_TIMESTAMP(6)')})[:-1]
            + ' ON DUPLICATE KEY UPDATE id=id;')
    def add_flow(kind, actor, order=None):
        cid, body = classes[kind]
        return insert('flows', {'id': str(uuid.uuid5(uuid.NAMESPACE_URL, f'{actor}:{kind}:{order}')),
            'flow_class_id': cid, 'flow_type': kind,
            'lecture_id': SQL('@demo_lecture_id') if order is None else None,
            'session_id': SQL('@demo_session_id') if order is not None else None,
            'text': body, 'format_version': 1, 'answers': {}, 'tasks': {}, 'current_page': 0,
            'status': 'active', 'revision': 1, 'created_by': actor, 'updated_by': actor,
            'created_at': SQL('UTC_TIMESTAMP(6)'), 'updated_at': SQL('UTC_TIMESTAMP(6)')})
    for row in rows:
        actor = row['actor']
        audit = {'created_by': actor, 'updated_by': actor, 'created_at': SQL('UTC_TIMESTAMP(6)'), 'updated_at': SQL('UTC_TIMESTAMP(6)')}
        organizer = row['organizer'] or {}
        sql.append(insert('lectures', {
            'name': row['name'], 'description': row['description'], 'academic_year_start': row['year'],
            'academic_year_end': row['year'], 'field_id': row['field'],
            'organizer_type': organizer.get('kind'), 'organizer_id': organizer.get('id'),
            'organizer_group_name': organizer.get('groupName'),
            'organizer_group_ids': [organizer['id']] if organizer.get('kind') == 'group' else [],
            'organizer_user_ids': [organizer['id']] if organizer.get('kind') == 'user' else [],
            'contact_group_ids': [], 'contact_user_ids': [], 'target_audience': '',
            'is_introductory': row['introductory'], 'traq_channel_id': row['channel'],
            'material': row['material'], 'resources': row['resources'], 'revision': 1, **audit,
        }))
        sql += ['SET @demo_lecture_id=LAST_INSERT_ID();', add_flow('lecture_pre', actor), add_flow('lecture_post', actor)]
        for session in row['sessions']:
            sql.append(insert('sessions', {
                'lecture_id': SQL('@demo_lecture_id'), 'name': session['name'], 'description': session['description'],
                'display_order': session['order'], 'session_date': session['date'], 'start_time': session['startTime'],
                'location': session['location'], 'knoq_url': session['knoqUrl'], 'instructor_id': session['instructorId'],
                'instructor_ids': [session['instructorId']] if session['instructorId'] else [],
                'material': session['material'], 'resources': session['resources'], 'replay_of_session_ids': [],
                'status': 'published', 'revision': 1, **audit,
            }))
            sql += ['SET @demo_session_id=LAST_INSERT_ID();', add_flow('session_main', actor, session['order'])]
    sql += ['COMMIT;']
    return '\n'.join(sql)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true', help='Insert into this checkout\'s local compose DB; otherwise dry run')
    args = parser.parse_args()
    rows = convert()
    summary = {'selected': len(rows), 'sessions': sum(len(r['sessions']) for r in rows),
               'upcomingDemoLectures': sum(r['future'] for r in rows),
               'teams': dict(collections.Counter(r['team'] or '未分類' for r in rows)),
               'years': sorted({r['year'] for r in rows})}
    output_path = Path(tempfile.gettempdir()) / 'leqtures-demo-import.json'
    output_path.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
    summary['outputPath'] = str(output_path)
    if args.apply:
        existing = set(db("SELECT created_by FROM lectures WHERE created_by LIKE 'demo-research-%';").splitlines())
        new = [r for r in rows if r['actor'] not in existing]
        if new:
            db(statements(new))
        summary.update(inserted=len(new), skipped=len(rows) - len(new))
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
