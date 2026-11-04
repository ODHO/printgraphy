import type { HomepageContent } from "@/lib/homepageContent";

export default function AboutSection({ about }: { about: HomepageContent["about"] }) {
  const features = about.features || [];

  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="max-w-4xl text-2xl font-extrabold tracking-tight text-[#042E7B] sm:text-3xl md:text-[2rem]">
          {about.title}
        </h2>
        <p className="mt-5 max-w-5xl text-[15px] leading-relaxed text-[#3d4654] sm:text-base">
          {about.body}
        </p>

        <div className="mt-10 grid grid-cols-1 gap-8 sm:mt-12 sm:grid-cols-2 sm:gap-12 lg:gap-16">
          {features.map((feature, idx) => (
            <div key={`${feature.title}-${idx}`}>
              <h3 className="text-lg font-bold text-[#042E7B] sm:text-xl">{feature.title}</h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-[#5b6472]">{feature.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
