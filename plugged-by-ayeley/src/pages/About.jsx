import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldCheck,
  Truck,
  BadgeCheck,
  Heart,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { SITE_CONFIG } from "@/lib/siteConfig";
import storyImage from "@/assets/story.png";

const STORY_IMG = storyImage;

export default function About() {
  const values = [
    {
      icon: ShieldCheck,
      title: "Original Products",
      desc: "Every item is genuine and sourced directly from trusted UK retailers.",
    },
    {
      icon: BadgeCheck,
      title: "UK-Sourced Quality",
      desc: "We bring the authentic quality of the UK high street straight to Ghana.",
    },
    {
      icon: Heart,
      title: "Customer Satisfaction",
      desc: "Your happiness is our priority. We stand behind every product we sell.",
    },
    {
      icon: Truck,
      title: "Convenience",
      desc: "Shop from your phone and have it delivered anywhere in Ghana.",
    },
    {
      icon: Sparkles,
      title: "Style",
      desc: "A curated selection of premium products, chosen with care.",
    },
    {
      icon: ShieldCheck,
      title: "Trust",
      desc: "A brand built on reliability, transparency, and genuine service.",
    },
  ];

  return (
    <div className="bg-white">
      {/* HERO */}
      <section className="bg-carbon text-white py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-pink font-semibold mb-4">
            About Us
          </p>

          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 text-balance">
            The Bridge Between
            <br />
            <span className="text-pink">London and Accra</span>
          </h1>

          <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            {SITE_CONFIG.brandName} is your trusted source for original,
            UK-sourced products delivered across Ghana. We believe everyone
            deserves access to authentic quality — and we make it effortless.
          </p>
        </div>
      </section>

      {/* STORY */}
      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="relative aspect-[4/3] overflow-hidden">
              <img
                src={STORY_IMG}
                alt="UK-sourced products"
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-pink font-semibold mb-4">
                Our Story
              </p>

              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-carbon mb-6 leading-tight">
                Authentic Products,
                <br />
                Delivered with Care
              </h2>

              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  {SITE_CONFIG.brandName} was founded on a simple idea: make
                  original, high-quality UK products easily accessible to
                  customers across Ghana. We saw a gap between what was
                  available and what people truly wanted — and we set out to
                  bridge it.
                </p>

                <p>
                  Every product in our catalogue is carefully sourced from
                  trusted UK retailers. We handle the sourcing, the shipping,
                  and the delivery — so all you have to do is shop and enjoy.
                </p>

                <p>
                  From toiletries and supplements to perfumes and beauty
                  products, we're committed to bringing you the very best,
                  straight from the UK to your door.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* VALUES */}
      <section className="py-16 sm:py-24 bg-london/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-[0.3em] text-pink font-semibold mb-4">
              What We Stand For
            </p>

            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-carbon">
              Our Values
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {values.map((value) => {
              const Icon = value.icon;

              return (
                <div
                  key={value.title}
                  className="bg-white border border-border p-6 hover:border-pink transition-colors"
                >
                  <div className="w-12 h-12 bg-pink/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-pink" />
                  </div>

                  <h3 className="font-heading font-bold text-lg text-carbon mb-2">
                    {value.title}
                  </h3>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {value.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-carbon text-white">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-3xl sm:text-4xl font-bold mb-6">
            Ready to Stay Plugged In?
          </h2>

          <p className="text-white/60 mb-8">
            Browse our collection of original UK-sourced products.
          </p>

          <Link
            to="/shop"
            className="inline-flex items-center gap-2 px-10 py-4 bg-pink text-white font-bold uppercase tracking-wider text-sm hover:bg-white hover:text-carbon transition-colors"
          >
            Shop Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>
    </div>
  );
}