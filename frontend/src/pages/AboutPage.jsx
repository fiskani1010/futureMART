import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AiOutlineLeft,
  AiOutlineRight,
  AiOutlineCamera,
  AiOutlineDollarCircle,
  AiOutlineGift,
  AiOutlineInstagram,
  AiOutlineSafety,
  AiOutlineShop,
  AiOutlineTwitter,
  AiOutlineUsergroupAdd,
} from "react-icons/ai";
import { FiLinkedin } from "react-icons/fi";
import styles from "./AboutPage.module.css";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const FALLBACK_IMAGE = "https://via.placeholder.com/320x360?text=Team+Member";

const FALLBACK_TEAM = [
  {
    id: 1,
    name: "Tom Cruise",
    role_title: "Founder & Chairman",
    image_url: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=500&q=80",
    x_url: "",
    instagram_url: "",
    linkedin_url: "",
  },
  {
    id: 2,
    name: "Emma Watson",
    role_title: "Managing Director",
    image_url: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=500&q=80",
    x_url: "",
    instagram_url: "",
    linkedin_url: "",
  },
  {
    id: 3,
    name: "Will Smith",
    role_title: "Product Designer",
    image_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
    x_url: "",
    instagram_url: "",
    linkedin_url: "",
  },
];

const STORY_STATS = [
  { icon: AiOutlineShop, value: "10.5k", label: "Sellers active on our site" },
  { icon: AiOutlineDollarCircle, value: "33k", label: "Monthly Product Sale", highlighted: true },
  { icon: AiOutlineUsergroupAdd, value: "45.5k", label: "Customers active in our site" },
  { icon: AiOutlineCamera, value: "25k", label: "Annual gross sale in our site" },
];

const SERVICE_POINTS = [
  { icon: AiOutlineGift, title: "FREE AND FAST DELIVERY", text: "Free delivery for all orders over $140" },
  { icon: AiOutlineShop, title: "24/7 CUSTOMER SERVICE", text: "Friendly 24/7 customer support" },
  { icon: AiOutlineSafety, title: "MONEY BACK GUARANTEE", text: "We return money within 30 days" },
];

const normalizeTeam = (rows) =>
  (Array.isArray(rows) ? rows : [])
    .filter((member) => member && member.name && member.role_title)
    .map((member, index) => ({
      id: member.id ?? index + 1,
      name: member.name,
      role_title: member.role_title,
      image_url: member.image_url || FALLBACK_IMAGE,
      x_url: member.x_url || "",
      instagram_url: member.instagram_url || "",
      linkedin_url: member.linkedin_url || "",
    }));

export default function AboutPage() {
  const [teamMembers, setTeamMembers] = useState(FALLBACK_TEAM);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const teamCarouselRef = useRef(null);

  useEffect(() => {
    let isMounted = true;

    const fetchTeam = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/team-members`);
        if (!response.ok) return;

        const data = await response.json().catch(() => []);
        const mapped = normalizeTeam(data);
        if (isMounted && mapped.length > 0) {
          setTeamMembers(mapped);
        }
      } catch {
        // Keep fallback team members.
      }
    };

    fetchTeam();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    setActiveTeamIndex(0);
  }, [teamMembers.length]);

  const scrollTeamToIndex = (index) => {
    const track = teamCarouselRef.current;
    if (!track) return;

    const cards = track.querySelectorAll("[data-team-card]");
    const boundedIndex = Math.min(Math.max(index, 0), cards.length - 1);
    const targetCard = cards[boundedIndex];
    if (!targetCard) return;

    track.scrollTo({
      left: targetCard.offsetLeft,
      behavior: "smooth",
    });
    setActiveTeamIndex(boundedIndex);
  };

  const handleTeamScroll = () => {
    const track = teamCarouselRef.current;
    if (!track) return;

    const cards = track.querySelectorAll("[data-team-card]");
    if (cards.length < 2) return;

    const trackCenter = track.scrollLeft + track.clientWidth / 2;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    cards.forEach((card, index) => {
      const cardCenter = card.offsetLeft + card.clientWidth / 2;
      const distance = Math.abs(cardCenter - trackCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    if (nearestIndex !== activeTeamIndex) {
      setActiveTeamIndex(nearestIndex);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link to="/">Home</Link>
        <span>/</span>
        <span>About</span>
      </div>

      <section className={styles.storySection}>
        <article className={styles.storyCopy}>
          <h1>Our Story</h1>
          <p>
            Launched in 2015, Exclusive is South Africa&apos;s premier online shopping marketplace with
            an active presence in Bangladesh. Supported by a wide range of tailored marketing,
            data, and service solutions, Exclusive has 10,500 sellers and over 300 brands and serves
            3 million customers across the region.
          </p>
          <p>
            Exclusive has more than 1 million products in stock, giving customers a broad collection
            that fulfills almost every need and category.
          </p>
        </article>

        <div className={styles.storyImageWrap}>
          <img
            src="https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1300&q=80"
            alt="Customers shopping happily"
          />
        </div>
      </section>

      <section className={styles.statsGrid}>
        {STORY_STATS.map((item) => (
          <article
            key={item.label}
            className={`${styles.statCard} ${item.highlighted ? styles.statCardActive : ""}`}
          >
            <span className={styles.statIcon}>
              <item.icon />
            </span>
            <strong>{item.value}</strong>
            <p>{item.label}</p>
          </article>
        ))}
      </section>

      <section className={styles.teamGrid} ref={teamCarouselRef} onScroll={handleTeamScroll}>
        {teamMembers.map((member) => (
          <article key={member.id} className={styles.teamCard} data-team-card>
            <div className={styles.memberImageWrap}>
              <img src={member.image_url || FALLBACK_IMAGE} alt={member.name} loading="lazy" />
            </div>

            <h2>{member.name}</h2>
            <p>{member.role_title}</p>

            <div className={styles.socialRow}>
              <a href={member.x_url || "#"} aria-label={`${member.name} on X`} target="_blank" rel="noreferrer">
                <AiOutlineTwitter />
              </a>
              <a
                href={member.instagram_url || "#"}
                aria-label={`${member.name} on Instagram`}
                target="_blank"
                rel="noreferrer"
              >
                <AiOutlineInstagram />
              </a>
              <a
                href={member.linkedin_url || "#"}
                aria-label={`${member.name} on LinkedIn`}
                target="_blank"
                rel="noreferrer"
              >
                <FiLinkedin />
              </a>
            </div>
          </article>
        ))}
      </section>

      {teamMembers.length > 1 ? (
        <div className={styles.teamCarouselControls}>
          <button
            type="button"
            className={styles.teamCarouselArrow}
            aria-label="Show previous team member"
            onClick={() => scrollTeamToIndex(activeTeamIndex - 1)}
            disabled={activeTeamIndex === 0}
          >
            <AiOutlineLeft />
          </button>

          <div className={styles.teamCarouselDots} role="tablist" aria-label="Team member slides">
            {teamMembers.map((member, index) => (
              <button
                key={member.id}
                type="button"
                role="tab"
                aria-label={`View ${member.name}`}
                aria-selected={activeTeamIndex === index}
                className={`${styles.teamCarouselDot} ${activeTeamIndex === index ? styles.teamCarouselDotActive : ""}`}
                onClick={() => scrollTeamToIndex(index)}
              />
            ))}
          </div>

          <button
            type="button"
            className={styles.teamCarouselArrow}
            aria-label="Show next team member"
            onClick={() => scrollTeamToIndex(activeTeamIndex + 1)}
            disabled={activeTeamIndex >= teamMembers.length - 1}
          >
            <AiOutlineRight />
          </button>
        </div>
      ) : null}

      <section className={styles.serviceGrid}>
        {SERVICE_POINTS.map((service) => (
          <article key={service.title} className={styles.serviceCard}>
            <span className={styles.serviceIcon}>
              <service.icon />
            </span>
            <h3>{service.title}</h3>
            <p>{service.text}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
