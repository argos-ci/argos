import { useRef, useState } from "react";
import { useApolloClient, useQuery } from "@apollo/client/react";
import { MarkGithubIcon } from "@primer/octicons-react";
import clsx from "clsx";
import {
  AtSignIcon,
  CheckIcon,
  EllipsisIcon,
  SearchIcon,
  SparklesIcon,
  UsersIcon,
} from "lucide-react";
import { Heading, Radio, RadioGroup } from "react-aria-components";
import { Helmet } from "react-helmet";
import {
  useController,
  useForm,
  type Control,
  type SubmitHandler,
} from "react-hook-form";
import { useSearchParams } from "react-router";

import { AuthGuard } from "@/containers/AuthGuard";
import { WelcomeIllustration } from "@/containers/WelcomeIllustration";
import { graphql } from "@/gql";
import { AccountPermission, SignupSource } from "@/gql/graphql";
import { BrandShield } from "@/ui/BrandShield";
import { Form } from "@/ui/Form";
import { FormCheckbox } from "@/ui/FormCheckbox";
import { FormRootError } from "@/ui/FormRootError";
import { FormSubmit } from "@/ui/FormSubmit";
import { FormTextInput } from "@/ui/FormTextInput";
import { Label } from "@/ui/Label";
import { LinkButton } from "@/ui/Link";
import { resolveWelcomeRedirect } from "@/util/welcome";

const AutoJoinQuery = graphql(`
  query Welcome_autoJoin($teamSlug: String!) {
    me {
      id
      eligibleAutoJoinDomain
    }
    account(slug: $teamSlug) {
      id
      name
      slug
      ... on Team {
        permissions
        teamDomains {
          id
        }
      }
    }
  }
`);

const CompleteWelcomeMutation = graphql(`
  mutation Welcome_completeWelcome($input: CompleteWelcomeInput!) {
    completeWelcome(input: $input) {
      id
      eligibleAutoJoinDomain
    }
  }
`);

/**
 * The answers, in the order they are offered: the channels people arrive
 * through most, and `other` last so its free-text field opens at the bottom of
 * the grid instead of pushing the remaining tiles around.
 */
const SOURCES: {
  value: SignupSource;
  label: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
}[] = [
  {
    value: SignupSource.SearchEngine,
    label: "Search engine",
    Icon: SearchIcon,
  },
  {
    value: SignupSource.AiAssistant,
    label: "AI assistant",
    Icon: SparklesIcon,
  },
  { value: SignupSource.SocialMedia, label: "Social media", Icon: AtSignIcon },
  { value: SignupSource.Github, label: "GitHub", Icon: MarkGithubIcon },
  { value: SignupSource.WordOfMouth, label: "Word of mouth", Icon: UsersIcon },
  { value: SignupSource.Other, label: "Somewhere else", Icon: EllipsisIcon },
];

type Inputs = {
  /** Empty until one is picked — a radio group has no null value. */
  source: SignupSource | "";
  sourceDetail: string;
  autoJoinDomain: boolean;
};

/**
 * The source answers as a grid of tiles.
 *
 * A stack of radios reads as a form to fill in; on the first screen of the
 * product the answers should look pickable. Built on the same
 * `useController` + `RadioGroup` pairing as the signup page's use-case field, so
 * it stays a real radio group for keyboard and screen-reader users.
 */
function SourceField(props: { control: Control<Inputs> }) {
  const { field } = useController({ control: props.control, name: "source" });
  // Destructured before the JSX: `react-hooks/refs` reads `field.ref` in render
  // position as a ref access, which it forbids. Same shape as the signup page's
  // use-case field.
  const { ref, value, onChange, onBlur, disabled } = field;
  return (
    <RadioGroup
      className="w-full"
      ref={ref}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      isDisabled={disabled}
    >
      <Label>Where did you find Argos?</Label>
      <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {SOURCES.map(({ value, label, Icon }) => (
          <Radio
            key={value}
            value={value}
            className={clsx(
              "group bg-app relative flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm",
              "transition-[background-color,border-color,box-shadow]",
              "data-hovered:border-hover data-hovered:bg-subtle",
              "data-focus-visible:ring-primary data-focus-visible:ring-2 data-focus-visible:outline-hidden",
              "data-selected:border-primary-active data-selected:bg-primary-app data-selected:shadow-xs",
            )}
          >
            {/* The icon gets its own plate, so the tile reads as an object with
                a picture on it rather than a label with an icon before it. */}
            <span
              className={clsx(
                "bg-ui text-low flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                "group-data-selected:bg-primary-ui group-data-selected:text-primary-low",
              )}
            >
              <Icon className="size-4.5" size={18} />
            </span>
            <span className="flex-1 leading-tight font-medium">{label}</span>
            {/* Only shown on the pick, so the grid stays quiet until the user
                acts. */}
            <CheckIcon className="text-primary-low size-4 shrink-0 opacity-0 transition-opacity group-data-selected:opacity-100" />
          </Radio>
        ))}
      </div>
    </RadioGroup>
  );
}

/**
 * The auto-join offer for the team named in the URL.
 *
 * The `team` param is whatever the URL says, so the offer is only made once the
 * server confirms the viewer administers that team. Rendering it otherwise put
 * the user in a dead end: ticking a box for a team they cannot open fails on
 * every Continue, and the mutation deliberately stores nothing when it refuses.
 */
function useAutoJoinOffer(): {
  isLoading: boolean;
  offer: { domain: string; teamSlug: string; teamName: string } | null;
} {
  const [searchParams] = useSearchParams();
  const teamSlug = searchParams.get("team");
  const { data, loading } = useQuery(AutoJoinQuery, {
    variables: { teamSlug: teamSlug ?? "" },
    // Nothing to offer without a team to open, so hobby signups pay nothing.
    skip: !teamSlug,
  });

  const domain = data?.me?.eligibleAutoJoinDomain ?? null;
  const account = data?.account;
  const isAdministered =
    account?.__typename === "Team" &&
    account.permissions.includes(AccountPermission.Admin);
  // Nothing to ask once the team is already open to a domain. `createTeam`
  // accepts the same choice on `/teams/new`, so a user who ticked it there was
  // otherwise asked again here — with the box unchecked, which reads as "off"
  // for a team where it is on, and unticking it does not close anything.
  const isAlreadyOpen =
    account?.__typename === "Team" && account.teamDomains.length > 0;

  return {
    isLoading: loading,
    offer:
      teamSlug && domain && isAdministered && !isAlreadyOpen
        ? { domain, teamSlug, teamName: account.name || account.slug }
        : null,
  };
}

/**
 * The auto-join question, and the space it occupies while its answer loads.
 *
 * The slot is claimed from the first render whenever the URL names a team —
 * which is the case where a domain is usually found — so the answers above it do
 * not move when the domain arrives. `min-h` rather than a fixed height: it
 * absorbs a label that wraps on a long domain without pinning the card.
 */
function AutoJoinField(props: {
  control: Control<Inputs>;
  offer: { domain: string; teamName: string } | null;
  isLoading: boolean;
}) {
  const { control, offer, isLoading } = props;
  return (
    <div className="bg-subtle mt-6 min-h-25 rounded-xl border p-4">
      {offer ? (
        <>
          <FormCheckbox
            control={control}
            name="autoJoinDomain"
            label={
              // The team is named, not called "this team": the page can be
              // reached with any `team` in its URL, and this control grants a
              // whole email domain access to whichever one that is. The user has
              // to be able to see which.
              <>
                Let <strong>@{offer.domain}</strong> emails join{" "}
                <strong>{offer.teamName}</strong>
              </>
            }
          />
          {/* "verified" moves down here: the label states the offer, the line
              under it states the condition. */}
          <p className="text-low mt-2 pl-6 text-xs">
            Anyone who verifies an @{offer.domain} address will see this team
            when they sign up and can join without an invite. You can change
            this later in the team settings.
          </p>
        </>
      ) : isLoading ? (
        <div className="animate-pulse" aria-hidden="true">
          <div className="flex items-center gap-2">
            <div className="bg-ui size-4 shrink-0 rounded-sm" />
            <div className="bg-ui h-3.5 flex-1 rounded" />
          </div>
          <div className="mt-3 space-y-2 pl-6">
            <div className="bg-ui h-2.5 w-full rounded" />
            <div className="bg-ui h-2.5 w-2/3 rounded" />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function WelcomeForm() {
  const client = useApolloClient();
  const [searchParams] = useSearchParams();
  const redirect = resolveWelcomeRedirect(searchParams.get("r"));
  const autoJoin = useAutoJoinOffer();

  const form = useForm<Inputs>({
    defaultValues: {
      source: "",
      sourceDetail: "",
      // Opt-in: opening a team to a whole email domain should be a decision,
      // not a default someone clicks past.
      autoJoinDomain: false,
    },
  });
  const source = form.watch("source");

  /**
   * Record the answers and move on. `answers` is null when the page was
   * skipped — which is still recorded, so the question is not put back in front
   * of the user the next time they create a team.
   *
   * Guarded against running twice. Skip does not go through `handleSubmit`, so
   * nothing else marks the form busy: pressing Continue and then Skip sent two
   * mutations, and the second one — carrying no answers — overwrote the first's
   * recorded source with null.
   */
  const isCompletingRef = useRef(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const complete = async (answers: Inputs | null) => {
    // A ref, not the state below: two clicks in the same tick would both read a
    // stale `false` from state.
    if (isCompletingRef.current) {
      return;
    }
    isCompletingRef.current = true;
    try {
      await client.mutate({
        mutation: CompleteWelcomeMutation,
        variables: {
          input: {
            source: answers?.source || null,
            sourceDetail: answers?.sourceDetail || null,
            autoJoinTeamSlug:
              answers?.autoJoinDomain && autoJoin.offer
                ? autoJoin.offer.teamSlug
                : null,
            // The domain the label showed, so the server opens that one or
            // nothing.
            autoJoinDomain:
              answers?.autoJoinDomain && autoJoin.offer
                ? autoJoin.offer.domain
                : null,
          },
        },
      });
    } catch (error) {
      // Released so a refused answer can be corrected and retried.
      isCompletingRef.current = false;
      throw error;
    }
    // Full navigation rather than a client-side one: the destination is a page
    // the user has not loaded yet in this flow (a team fresh out of Stripe
    // checkout, or their dashboard), so it should bootstrap from scratch.
    window.location.replace(redirect);
    await new Promise(() => {
      // Never resolves, keeping the form in its submitting state until the
      // browser leaves the page.
    });
  };

  const onSubmit: SubmitHandler<Inputs> = async (answers) => {
    await complete(answers);
  };

  return (
    <Form form={form} onSubmit={onSubmit} className="w-full">
      <SourceField control={form.control} />

      {source === SignupSource.Other ? (
        <FormTextInput
          control={form.control}
          {...form.register("sourceDetail", {
            // Matches the column, so the answer cannot be rejected after the
            // user has typed it.
            maxLength: {
              value: 255,
              message: "Keep it under 255 characters",
            },
          })}
          label="Where, exactly?"
          className="mt-4"
          autoFocus
          autoComplete="off"
        />
      ) : null}

      {autoJoin.isLoading || autoJoin.offer ? (
        <AutoJoinField
          control={form.control}
          offer={autoJoin.offer}
          isLoading={autoJoin.isLoading}
        />
      ) : null}

      <div className="mt-8 flex items-center justify-between gap-4">
        <LinkButton
          className="text-sm"
          isDisabled={isSkipping || form.formState.isSubmitting}
          onPress={() => {
            setIsSkipping(true);
            complete(null).catch(() => {
              // The answers are optional, so a failure here is no reason to
              // trap the user on this page.
              window.location.replace(redirect);
            });
          }}
        >
          Skip
        </LinkButton>
        <div className="flex items-center gap-4">
          <FormRootError control={form.control} />
          <FormSubmit control={form.control} size="large">
            Continue
          </FormSubmit>
        </div>
      </div>
    </Form>
  );
}

/**
 * The illustration and one line saying what it shows, so the pane reads as a
 * promise about the product rather than as decoration.
 *
 * Dropped below `lg`: on a narrow screen the questions are the whole job, and a
 * picture above them would only push the answers off the fold.
 */
function ShowcasePane() {
  return (
    <div className="bg-subtle hidden flex-col items-center justify-center border-l p-12 lg:flex">
      <div className="w-full max-w-md">
        <WelcomeIllustration />
        <p className="text-low mt-8 text-center text-sm text-balance">
          Argos screenshots what your CI builds, shows you what moved, and waits
          for your call.
        </p>
      </div>
    </div>
  );
}

export function Component() {
  return (
    // `min-h-full` rather than `flex-1`: this page renders outside the app
    // layout, so its parent is `#root` and there is no flex row to grow into.
    <div className="grid min-h-full lg:grid-cols-2">
      <Helmet>
        <title>Welcome</title>
      </Helmet>
      <div className="flex flex-col justify-center px-6 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-lg">
          <BrandShield className="mb-8 size-10" />
          <Heading level={1} className="text-3xl font-semibold tracking-tight">
            Welcome to Argos
          </Heading>
          <p className="text-low mt-2 mb-10 text-balance">
            Two questions before you start, both optional.
          </p>
          {/* Nothing here waits on a request: the page reads everything it needs
              from the auth bootstrap and the URL, so it paints once. */}
          <AuthGuard>{() => <WelcomeForm />}</AuthGuard>
        </div>
      </div>
      <ShowcasePane />
    </div>
  );
}
