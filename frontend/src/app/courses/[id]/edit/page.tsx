import layoutStyles from "@/styles/page-layout.module.css";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getCourse } from "@/lib/courses";
import { CourseEditor } from "@/components/admin/course-editor";
async function Edit({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const user = await getCurrentUser();
    if (!user)
        redirect("/login");
    const { id } = await params;
    if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807"))
        notFound();
    const course = await getCourse(id);
    if (!course || course.ownerId !== user.id)
        notFound();
    const waypoints = course.routeWaypoints?.coordinates ?? course.routeGeojson.coordinates;
    return <CourseEditor initialCourse={{ id: course.id, name: course.name, description: course.description, courseType: course.courseType, published: course.published, elevationProfile: course.elevationProfile, distanceMeters: course.distanceMeters, routeCoordinates: course.routeGeojson.coordinates.map(([lng, lat]) => ({ lat, lng })), points: waypoints.map(([lng, lat]) => ({ lat, lng })) }}/>;
}
export default function EditCoursePage(props: {
    params: Promise<{
        id: string;
    }>;
}) {
    return <main id="main-content" className={layoutStyles.detailPage}><header className={layoutStyles.detailHeading}><h1>내 코스 수정</h1></header><Suspense fallback={<p>코스를 불러오는 중…</p>}><Edit {...props}/></Suspense></main>;
}
