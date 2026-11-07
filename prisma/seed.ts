import { PrismaClient, type Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function demoPassword(): string {
  const value = process.env.DEMO_PASSWORD;
  if (!value) throw new Error('DEMO_PASSWORD must be set (see .env.local)');
  return value;
}

const DEMO_PASSWORD = demoPassword();

const ids = {
  admin: '11111111-1111-4111-8111-111111111111',
  principal: '22222222-2222-4222-8222-222222222222',
  teacher: '33333333-3333-4333-8333-333333333333',
  coordinator: '44444444-4444-4444-8444-444444444444',
  student: '55555555-5555-4555-8555-555555555555',
  parent: '66666666-6666-4666-8666-666666666666',
  materialApproved: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  materialPending: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  noticeApproved: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1',
  noticePending: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2',
  activityApproved: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc1',
  activityPending: 'cccccccc-cccc-4ccc-8ccc-ccccccccccc2',
  approvalMaterialApproved: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd1',
  approvalMaterialPending: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd2',
  approvalNoticeApproved: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd3',
  approvalNoticePending: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd4',
  approvalActivityApproved: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd5',
  approvalActivityPending: 'dddddddd-dddd-4ddd-8ddd-ddddddddddd6',
};

function env(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const daysFromNow = (days: number) => new Date(Date.now() + days * 24 * 60 * 60 * 1000);

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const people: { id: string; email: string; name: string; role: Role; gradeLevel?: string }[] = [
    { id: ids.admin, email: 'admin@schoolsync.local', name: 'School Admin', role: 'ADMIN' },
    { id: ids.principal, email: 'principal@schoolsync.local', name: 'Principal Hart', role: 'PRINCIPAL' },
    { id: ids.teacher, email: 'teacher@schoolsync.local', name: 'Ms. Rivera', role: 'TEACHER', gradeLevel: 'Grade 5' },
    { id: ids.coordinator, email: 'coordinator@schoolsync.local', name: 'Coach Bello', role: 'COORDINATOR' },
    { id: ids.student, email: 'student@schoolsync.local', name: 'Grade 5 Student', role: 'STUDENT', gradeLevel: 'Grade 5' },
    { id: ids.parent, email: 'parent@schoolsync.local', name: 'Grade 5 Parent', role: 'PARENT', gradeLevel: 'Grade 5' },
  ];

  for (const person of people) {
    await prisma.user.upsert({
      where: { email: person.email },
      update: {
        name: person.name,
        role: person.role,
        gradeLevel: person.gradeLevel ?? null,
        passwordHash,
      },
      create: { ...person, passwordHash },
    });
  }

  const teachingAgentId = env('SWITCH_TEACHING_AGENT_ID');
  const teachingAgentName = env('SWITCH_TEACHING_AGENT_NAME', 'schoolsync-teaching-agent');
  const operationsAgentId = process.env.SWITCH_OPERATIONS_AGENT_ID ?? teachingAgentId;
  const operationsAgentName = process.env.SWITCH_OPERATIONS_AGENT_NAME ?? teachingAgentName;
  const activitiesAgentId = process.env.SWITCH_ACTIVITIES_AGENT_ID ?? teachingAgentId;
  const activitiesAgentName = process.env.SWITCH_ACTIVITIES_AGENT_NAME ?? teachingAgentName;

  const rooms = [
    {
      id: 'classroom-lab',
      switchRoomId: env('SWITCH_CLASSROOM_ROOM_ID'),
      name: 'Classroom Lab',
      purpose: 'classroom',
      agentId: teachingAgentId,
      agentName: teachingAgentName,
      mattermostChannel: null,
    },
    {
      id: 'school-operations',
      switchRoomId: env('SWITCH_OPERATIONS_ROOM_ID'),
      name: 'School Operations',
      purpose: 'operations',
      agentId: operationsAgentId,
      agentName: operationsAgentName,
      mattermostChannel: null,
    },
    {
      id: 'school-activities',
      switchRoomId: env('SWITCH_ACTIVITIES_ROOM_ID'),
      name: 'School Activities',
      purpose: 'activities',
      agentId: activitiesAgentId,
      agentName: activitiesAgentName,
      mattermostChannel: null,
    },
  ];

  for (const room of rooms) {
    await prisma.switchRoom.upsert({
      where: { purpose: room.purpose },
      update: {
        switchRoomId: room.switchRoomId,
        name: room.name,
        agentId: room.agentId,
        agentName: room.agentName,
      },
      create: room,
    });
  }

  await prisma.teachingMaterial.upsert({
    where: { id: ids.materialApproved },
    update: {},
    create: {
      id: ids.materialApproved,
      title: 'The Water Cycle — Grade 5',
      subject: 'Science',
      gradeLevel: 'Grade 5',
      prompt: 'A short worksheet on the water cycle with five questions and an answer key.',
      content: `# The Water Cycle

**Learning goal:** Name the stages of the water cycle and explain how water moves through them.

## Questions

1. What happens during evaporation?
2. Why does condensation form on a cold glass?
3. Name two forms of precipitation.
4. How does water return to rivers and lakes after it falls?
5. Draw and label the water cycle: evaporation, condensation, precipitation, collection.

## Answer key

1. The sun heats water, turning it into vapor that rises into the air.
2. Warm water vapor in the air cools when it touches the cold glass and becomes liquid droplets.
3. Rain, snow, sleet or hail.
4. Water runs over the ground into streams and rivers, or soaks into the soil and moves underground.
5. Labels should show the four stages in a loop.`,
      status: 'APPROVED',
      switchRoomId: env('SWITCH_CLASSROOM_ROOM_ID'),
      authorId: ids.teacher,
      approvedById: ids.teacher,
      approvedAt: daysFromNow(-4),
      createdAt: daysFromNow(-5),
    },
  });

  await prisma.teachingMaterial.upsert({
    where: { id: ids.materialPending },
    update: {},
    create: {
      id: ids.materialPending,
      title: 'Equivalent Fractions Practice',
      subject: 'Mathematics',
      gradeLevel: 'Grade 5',
      prompt: 'Ten practice questions on equivalent fractions, with a worked example and an answer key.',
      content: `# Equivalent Fractions

**Worked example:** 1/2 = 2/4 = 4/8. Multiply or divide the numerator and denominator by the same number.

## Practice

1. 1/3 = ?/9
2. 2/5 = ?/15
3. 3/4 = 9/?
4. 6/8 = ?/4
5. 5/10 = 1/?
6. 4/6 = ?/3
7. 7/14 = ?/2
8. 8/12 = ?/3
9. 2/7 = ?/21
10. 9/12 = 3/?

## Answer key

1. 3  2. 6  3. 12  4. 3  5. 2  6. 2  7. 1  8. 2  9. 6  10. 4`,
      status: 'PENDING_APPROVAL',
      switchRoomId: env('SWITCH_CLASSROOM_ROOM_ID'),
      authorId: ids.teacher,
      createdAt: daysFromNow(-1),
    },
  });

  await prisma.notice.upsert({
    where: { id: ids.noticeApproved },
    update: {},
    create: {
      id: ids.noticeApproved,
      title: 'Science Fair this Friday',
      brief: 'Remind every family that the science fair is Friday at 2pm in the main hall.',
      body: `Dear SchoolSync families,

Our annual Science Fair is this Friday at 2:00 PM in the Main Hall. Students should bring their projects to the hall by 1:30 PM. Families are welcome to visit from 2:00 to 4:00 PM.

We look forward to celebrating our young scientists!`,
      audience: 'ALL',
      status: 'APPROVED',
      switchRoomId: env('SWITCH_OPERATIONS_ROOM_ID'),
      authorId: ids.principal,
      approvedById: ids.principal,
      approvedAt: daysFromNow(-2),
      publishedAt: daysFromNow(-2),
      createdAt: daysFromNow(-3),
    },
  });

  await prisma.notice.upsert({
    where: { id: ids.noticePending },
    update: {},
    create: {
      id: ids.noticePending,
      title: 'Parent–Teacher Conferences',
      brief: 'Invite parents to book a 15-minute conference slot next week and explain how to sign up.',
      body: `Dear Parents and Guardians,

Parent–Teacher Conferences will take place next Wednesday and Thursday, from 3:30 to 6:00 PM. Each conference lasts 15 minutes. Please book a slot through the school office by Monday.

If neither evening works for your family, contact your child's teacher to arrange another time.`,
      audience: 'PARENTS',
      status: 'PENDING_APPROVAL',
      switchRoomId: env('SWITCH_OPERATIONS_ROOM_ID'),
      authorId: ids.principal,
      createdAt: daysFromNow(-1),
    },
  });

  await prisma.activity.upsert({
    where: { id: ids.activityApproved },
    update: {},
    create: {
      id: ids.activityApproved,
      title: 'Inter-House Debate',
      description: 'A friendly debate between the four school houses on the motion "Homework should be optional".',
      eventDate: daysFromNow(10),
      location: 'Main Hall',
      plan: `# Inter-House Debate Plan

**Motion:** Homework should be optional.

- 2:00 PM — Houses assemble; welcome and rules.
- 2:15 PM — Opening arguments (4 minutes per house).
- 2:45 PM — Rebuttals (2 minutes per house).
- 3:10 PM — Floor questions from the audience.
- 3:30 PM — Judges deliberate; closing remarks.
- 3:45 PM — Results and house points.

**Roles:** Two student moderators, three teacher judges, one timekeeper per house.`,
      status: 'APPROVED',
      switchRoomId: env('SWITCH_ACTIVITIES_ROOM_ID'),
      authorId: ids.coordinator,
      approvedById: ids.coordinator,
      approvedAt: daysFromNow(-3),
      createdAt: daysFromNow(-4),
    },
  });

  await prisma.activity.upsert({
    where: { id: ids.activityPending },
    update: {},
    create: {
      id: ids.activityPending,
      title: 'School Garden Day',
      description: 'Students plant herbs and vegetables in the school garden and learn about composting.',
      eventDate: daysFromNow(21),
      location: 'School Garden',
      plan: `# School Garden Day Plan

- 9:00 AM — Welcome and safety briefing.
- 9:20 AM — Groups rotate through planting, composting and seed-labeling stations.
- 11:00 AM — Watering and garden journal entries.
- 11:45 AM — Clean-up and reflection circle.

**Materials:** Seedlings, trowels, gloves, compost, watering cans, journals. Families may donate seedlings through the office.`,
      status: 'PENDING_APPROVAL',
      switchRoomId: env('SWITCH_ACTIVITIES_ROOM_ID'),
      authorId: ids.coordinator,
      createdAt: daysFromNow(-1),
    },
  });

  const approvals = [
    {
      id: ids.approvalMaterialApproved,
      kind: 'MATERIAL' as const,
      entityId: ids.materialApproved,
      entityTitle: 'The Water Cycle — Grade 5',
      requesterId: ids.teacher,
      reviewerId: ids.teacher,
      status: 'APPROVED' as const,
      decidedAt: daysFromNow(-4),
      createdAt: daysFromNow(-5),
    },
    {
      id: ids.approvalMaterialPending,
      kind: 'MATERIAL' as const,
      entityId: ids.materialPending,
      entityTitle: 'Equivalent Fractions Practice',
      requesterId: ids.teacher,
      reviewerId: null,
      status: 'PENDING_APPROVAL' as const,
      decidedAt: null,
      createdAt: daysFromNow(-1),
    },
    {
      id: ids.approvalNoticeApproved,
      kind: 'NOTICE' as const,
      entityId: ids.noticeApproved,
      entityTitle: 'Science Fair this Friday',
      requesterId: ids.principal,
      reviewerId: ids.principal,
      status: 'APPROVED' as const,
      decidedAt: daysFromNow(-2),
      createdAt: daysFromNow(-3),
    },
    {
      id: ids.approvalNoticePending,
      kind: 'NOTICE' as const,
      entityId: ids.noticePending,
      entityTitle: 'Parent–Teacher Conferences',
      requesterId: ids.principal,
      reviewerId: null,
      status: 'PENDING_APPROVAL' as const,
      decidedAt: null,
      createdAt: daysFromNow(-1),
    },
    {
      id: ids.approvalActivityApproved,
      kind: 'ACTIVITY' as const,
      entityId: ids.activityApproved,
      entityTitle: 'Inter-House Debate',
      requesterId: ids.coordinator,
      reviewerId: ids.coordinator,
      status: 'APPROVED' as const,
      decidedAt: daysFromNow(-3),
      createdAt: daysFromNow(-4),
    },
    {
      id: ids.approvalActivityPending,
      kind: 'ACTIVITY' as const,
      entityId: ids.activityPending,
      entityTitle: 'School Garden Day',
      requesterId: ids.coordinator,
      reviewerId: null,
      status: 'PENDING_APPROVAL' as const,
      decidedAt: null,
      createdAt: daysFromNow(-1),
    },
  ];

  for (const approval of approvals) {
    await prisma.approval.upsert({
      where: { kind_entityId: { kind: approval.kind, entityId: approval.entityId } },
      update: {},
      create: approval,
    });
  }

  console.warn('Seeded SchoolSync demo data.');
  console.warn(`Accounts use the DEMO_PASSWORD from .env.local.`);
  for (const person of people) {
    console.warn(`  ${person.role.padEnd(12)} ${person.email}`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
